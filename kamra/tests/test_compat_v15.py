# //// Neoffice — added file (no upstream equivalent)
# Why: Kamra's own tests prove its rights, its wizard guard and its empty Time fields on Frappe 16. Frappe 15 differs in
# four ways that test code cannot see by itself: custom rights are answered by compat_v15.has_permission (the native
# function does not know them), Frappe 15 skips only_for() while frappe.flags.in_test is set, new_doc() fills every
# Time field, and a cache read of a missing key hides a later write with a lifetime. This file proves the same
# behaviours under Frappe 15. Skipped on Frappe 16 (remove with compat_v15.py).
import ast
import json
import pathlib
import unittest

import frappe

from kamra import api, compat_v15
from kamra.tests.audit_fixtures import AuditTestCase, ensure_user


@unittest.skipIf(compat_v15.native(), "Frappe 16 answers these natively")
class CompatV15TestCase(AuditTestCase):
	properties = ()

	def tearDown(self):
		frappe.flags.in_test = True
		super().tearDown()

	def users(self):
		return (ensure_user("v15.desk@test.local", ["Front Desk"]),
		        ensure_user("v15.house@test.local", ["Housekeeping"]),
		        ensure_user("v15.gm@test.local", ["Hotel Admin"]))

	def test_custom_rights_follow_the_roles(self):
		desk, house, _ = self.users()
		doctype, ptype = api.check_in._kamra_perm
		self.assertTrue(compat_v15.has_permission(doctype, ptype, user=desk))
		self.assertFalse(compat_v15.has_permission(doctype, ptype, user=house))
		with self.assertRaises(frappe.PermissionError):
			compat_v15.has_permission(doctype, ptype, user=house, throw=True)
		# a standard right still goes the native way
		self.assertTrue(compat_v15.has_permission("Reservation", "read", user=desk))

	def test_the_map_of_rights_the_app_draws_its_menus_from_holds_the_custom_rights(self):
		desk, house, _ = self.users()
		doctype, ptype = api.check_in._kamra_perm
		frappe.set_user(desk)  # nosemgrep: frappe-setuser -- the role under test
		can = api.my_permissions()
		self.assertIn(ptype, can[doctype])
		self.assertIn("app_front_desk", can["Property"])
		frappe.set_user(house)  # nosemgrep: frappe-setuser -- the role under test
		self.assertNotIn(ptype, api.my_permissions().get(doctype, []))

	def test_staff_cannot_use_the_wizard_or_the_role_permission_manager_outside_tests(self):
		from frappe.core.page.permission_manager import permission_manager as rpm

		from kamra import setup_guard
		desk, _, gm = self.users()
		frappe.flags.in_test = False  # Frappe 15's only_for() lets everyone in while this is set
		frappe.set_user(desk)  # nosemgrep: frappe-setuser -- the role under test
		with self.assertRaises(frappe.PermissionError):
			setup_guard.setup_complete(json.dumps({}))
		with self.assertRaises(frappe.PermissionError):
			setup_guard.initialize_system_settings_and_user(json.dumps({}), json.dumps({}))
		frappe.set_user(gm)  # nosemgrep: frappe-setuser -- the role under test
		for call in (lambda: rpm.get_permissions("Folio"),
		             lambda: rpm.add("Folio", "Front Desk", 0),
		             lambda: rpm.update("Folio", "Front Desk", 0, "bill", 1),
		             lambda: rpm.reset("Folio")):
			with self.assertRaises(frappe.PermissionError):
				call()

	def test_a_new_reservation_has_no_planned_time_until_one_is_given(self):
		doc = frappe.new_doc("Reservation")
		self.assertFalse(doc.planned_check_in_time)
		self.assertFalse(doc.planned_check_out_time)

	def test_a_cache_read_sees_a_write_with_a_lifetime_made_after_a_miss(self):
		key = "kamra_v15_probe"
		frappe.cache.delete_value(key)
		self.assertIsNone(frappe.cache.get_value(key, expires=True))
		frappe.cache.set_value(key, 3, expires_in_sec=30)
		self.assertEqual(frappe.cache.get_value(key, expires=True), 3)
		frappe.cache.delete_value(key)

	def test_no_cache_read_of_the_app_is_left_without_expires(self):
		"""Merge guard: a cache.get_value() added by an upstream merge must carry expires=True (see compat_v15.py)."""
		root = pathlib.Path(frappe.get_app_path("kamra"))
		left = []
		for f in sorted(root.rglob("*.py")):
			if "tests" in f.parts or f.name == "compat_v15.py":
				continue
			for node in ast.walk(ast.parse(f.read_text())):
				if (isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute)
				    and node.func.attr == "get_value" and "cache" in ast.unparse(node.func.value)
				    and not any(k.arg == "expires" for k in node.keywords)):
					left.append(f"{f.relative_to(root)}:{node.lineno}")
		self.assertEqual(left, [])

	def test_every_field_frappe_15_would_drop_is_restored(self):
		"""Merge guard: a new `*_seen` field on a doctype that does not track seen would vanish from get_all on Frappe 15
		(see compat_v15.restore_field); name it here once the read is restored."""
		restored = {("Kitchen Printer", "last_seen"), ("POS Order Item", "void_seen")}
		found = set()
		for f in sorted(pathlib.Path(frappe.get_app_path("kamra", "kamra", "doctype")).glob("*/*.json")):
			d = json.loads(f.read_text())
			if d.get("doctype") != "DocType" or d.get("track_seen"):
				continue
			found |= {(d["name"], x["fieldname"]) for x in d.get("fields", []) if "_seen" in (x.get("fieldname") or "")}
		self.assertEqual(found, restored)
