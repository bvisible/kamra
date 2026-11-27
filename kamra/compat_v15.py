# //// Neoffice — added file (no upstream equivalent)
# Why: Kamra's actions (require_perm) are custom rights ("Permission Types") stored as check columns of DocPerm and
# Custom DocPerm. Frappe 16 creates those columns and answers has_permission() for them; Frappe 15 has neither, so
# every require_perm endpoint refused everyone but Administrator, and `bench migrate` died on the missing
# "Permission Type" doctype. This file creates the columns and answers the custom rights from the roles' grants.
# Remove when the fleet runs Frappe 16 (the native path below then takes over by itself).
import functools
import json
import pathlib

import frappe
from frappe.utils import cint, cstr

# Frappe 15 ignores custom fields on DocPerm (a core doctype) but takes them on Custom DocPerm: the grants live there
TARGETS = ("Custom DocPerm",)
STANDARD = frozenset((
	"select", "read", "write", "create", "delete", "submit", "cancel", "amend", "print", "email", "report",
	"import", "export", "share", "if_owner", "permlevel"))


def native() -> bool:
	"""True on Frappe 16, which has the Permission Type doctype."""
	return bool(frappe.db.exists("DocType", "Permission Type"))


@functools.lru_cache(maxsize=1)
def _shipped_types() -> tuple:
	folder = pathlib.Path(frappe.get_app_path("kamra", "kamra", "permission_type"))
	return tuple(json.loads(f.read_text()) for f in sorted(folder.glob("*/*.json")))
@functools.lru_cache(maxsize=1)
def _shipped_doctypes() -> dict:
	"""{doctype name: its JSON definition} for Kamra's shipped doctypes."""
	out = {}
	for f in sorted(pathlib.Path(frappe.get_app_path("kamra", "kamra", "doctype")).glob("*/*.json")):
		d = json.loads(f.read_text())
		if d.get("doctype") == "DocType":
			out[d["name"]] = d
	return out
def ptype_names() -> list[str]:
	return sorted({d.get("perm_type") for d in _shipped_types() if d.get("perm_type")})
def permission_types() -> list:
	"""The Permission Type records: the doctype's rows on Frappe 16, the shipped JSON files on Frappe 15."""
	if native():
		return frappe.get_all("Permission Type", fields=["name", "doc_type", "perm_type"])
	return [frappe._dict(name=d["name"], doc_type=d["doc_type"], perm_type=d["perm_type"]) for d in _shipped_types()]
def granted_roles(pt) -> list:
	"""Roles the shipped doctype grants `pt` at level 0 (the standard DocPerm rows on Frappe 16)."""
	if native():
		return frappe.get_all("DocPerm", pluck="role", filters={"parent": pt.doc_type, "permlevel": 0, pt.perm_type: 1})
	rows = _shipped_doctypes().get(pt.doc_type, {}).get("permissions", [])
	return [r["role"] for r in rows if cint(r.get(pt.perm_type)) and not cint(r.get("permlevel"))]
def custom_rights(meta) -> set:
	"""Frappe 15: the custom rights the signed-in user holds on `meta` (get_role_permissions reports standard rights only)."""
	if native():
		return set()
	roles = set(frappe.get_roles())
	return {pt for pt in ptype_names()
	        if any(p.role in roles and cint(p.get(pt)) and not cint(p.permlevel) for p in meta.permissions)}
def restore_field(rows: list, doctype: str, field: str) -> list:
	"""Frappe 15's get_all drops, without a word, any requested field whose name contains "_seen" (a substring test meant
	for its optional `_seen` column) unless the table has that column: `last_seen` and `void_seen` never came back, so a
	printer showed offline and a cancelled kitchen line never cleared. Read the field with get_values instead."""
	if not rows or field in rows[0]:
		return rows
	values = dict(frappe.db.get_values(doctype, {"name": ["in", [r.name for r in rows]]}, ["name", field]))
	for r in rows:
		r[field] = values.get(r.name)
	return rows
def keep_empty_times() -> None:
	"""Frappe 15 fills every Time field of a new document with the current time (frappe.new_doc); Frappe 16 does it only
	for a default of "now". A booking without a planned time then showed one. Undone for Kamra's own doctypes only."""
	import frappe.model.create_new as create_new
	if int(frappe.__version__.split(".")[0]) >= 16 or getattr(create_new, "_kamra_empty_times", False):
		return
	original = create_new.set_dynamic_default_values
	def set_dynamic_default_values(doc, parent_doc, parentfield):
		original(doc, parent_doc, parentfield)
		meta = frappe.get_meta(doc["doctype"])
		if meta.module != "Kamra":
			return
		for df in meta.get("fields"):
			default = cstr(df.get("default"))
			if df.fieldtype == "Time" and default.lower() != "now" and not default.startswith(":"):
				doc[df.fieldname] = default or None
	create_new.set_dynamic_default_values = set_dynamic_default_values
	create_new._kamra_empty_times = True


def ensure_columns() -> int:
	"""Frappe 15: one check column per Permission Type on DocPerm and Custom DocPerm, before the doctypes sync."""
	if native():
		return 0
	made = 0
	for dt in TARGETS:
		for name in ptype_names():
			if not frappe.db.exists("Custom Field", {"dt": dt, "fieldname": name}):
				frappe.get_doc({"doctype": "Custom Field", "dt": dt, "fieldname": name, "fieldtype": "Check",
				                "label": name.replace("_", " ").title()}).insert(ignore_permissions=True)
				made += 1
	if made:
		frappe.clear_cache()
	return made


def seed_grants() -> int:
	"""Frappe 15: a doctype's JSON permission rows cannot carry the custom rights (DocPerm has no such columns), so copy
	each Kamra doctype's rows, custom rights included, into Custom DocPerm, once per doctype. Custom DocPerm replaces
	the standard rows wholesale, which is why every right is copied. What a hotel changes afterwards is theirs."""
	if native():
		return 0
	made = 0
	for f in sorted(pathlib.Path(frappe.get_app_path("kamra", "kamra", "doctype")).glob("*/*.json")):
		d = json.loads(f.read_text())
		if d.get("doctype") != "DocType" or not d.get("permissions"):
			continue
		if frappe.db.exists("Custom DocPerm", {"parent": d["name"]}):
			continue
		for row in d["permissions"]:
			frappe.get_doc({**{k: v for k, v in row.items() if k not in ("doctype", "name")},
			                "doctype": "Custom DocPerm", "parent": d["name"], "parenttype": "DocType",
			                "parentfield": "permissions"}).insert(ignore_permissions=True)
			made += 1
		frappe.clear_cache(doctype=d["name"])
	return made


def has_permission(doctype, ptype="read", doc=None, user=None, **kwargs):
	"""frappe.has_permission, also for Kamra's custom rights on Frappe 15."""
	if ptype in STANDARD or native():
		return frappe.has_permission(doctype, ptype, doc=doc, user=user, **kwargs)
	from kamra.authz import perm_roles

	user = user or frappe.session.user
	allowed = user == "Administrator" or bool(set(frappe.get_roles(user)) & set(perm_roles(doctype, ptype)))
	if not allowed and kwargs.get("throw"):
		frappe.throw(frappe._("No permission for {0}").format(doctype), frappe.PermissionError)
	return allowed
