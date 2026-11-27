# //// Neoffice — added file (no upstream equivalent)
"""A hotel never moves the clock of the whole ERP (neoffice-maintenance#3433).

On a Neoffice instance Kamra is one app of a company's ERP: the site's time zone (System Settings) is the company's,
Europe/Zurich on every instance. Upstream wrote the sole property's zone into System Settings on every save, and a new
property's default zone was Asia/Kolkata (with India and INR): creating a first hotel put the whole ERP on Calcutta
time (osiris, 27.11.2026). Here a hotel keeps its own zone for itself, and a new one starts from the instance's zone,
country and currency.
"""

import json
import os
import unittest
from unittest.mock import MagicMock, patch

import frappe
import frappe.defaults

from kamra.kamra.doctype.property.property import Property


def _bare_property(**values):
	doc = Property.__new__(Property)
	doc.__dict__.update({"doctype": "Property", "name": "P", "timezone": "", "country": "", "currency": ""})
	doc.__dict__.update(values)
	return doc


class TestAHotelNeverMovesTheErpClock(unittest.TestCase):
	def test_saving_the_sole_hotel_never_moves_the_site_clock(self):
		doc = _bare_property(timezone="Asia/Kolkata")
		doc.has_value_changed = lambda field: True
		db = MagicMock()
		db.count.return_value = 1
		db.get_single_value.return_value = "Europe/Zurich"
		with patch.object(frappe, "db", db), patch.object(frappe, "clear_cache"):
			doc.on_update()
		written = [
			c for c in db.set_single_value.call_args_list if c.args[:2] == ("System Settings", "time_zone")
		]
		self.assertEqual(written, [], "the hotel's zone is never written into System Settings")

	def test_a_new_hotel_takes_the_instance_zone_country_and_currency(self):
		doc = _bare_property()
		db = MagicMock()
		db.get_single_value.side_effect = lambda doctype, field: {
			"time_zone": "Europe/Zurich",
			"country": "Switzerland",
		}.get(field)
		with (
			patch.object(frappe, "db", db),
			patch.object(frappe.defaults, "get_global_default", return_value="Test Company"),
			patch.object(frappe, "get_cached_value", return_value="CHF"),
		):
			doc.before_insert()
		self.assertEqual((doc.timezone, doc.country, doc.currency), ("Europe/Zurich", "Switzerland", "CHF"))

	def test_what_the_person_typed_is_kept(self):
		doc = _bare_property(timezone="Europe/Paris", country="France", currency="EUR")
		db = MagicMock()
		db.get_single_value.return_value = "Europe/Zurich"
		with (
			patch.object(frappe, "db", db),
			patch.object(frappe.defaults, "get_global_default", return_value="Test Company"),
			patch.object(frappe, "get_cached_value", return_value="CHF"),
		):
			doc.before_insert()
		self.assertEqual((doc.timezone, doc.country, doc.currency), ("Europe/Paris", "France", "EUR"))

	def test_the_property_form_carries_no_indian_default(self):
		path = os.path.join(os.path.dirname(__file__), "..", "kamra", "doctype", "property", "property.json")
		fields = {f["fieldname"]: f for f in json.load(open(path))["fields"]}
		for name in ("timezone", "country", "currency"):
			self.assertNotIn(
				"default", fields[name], f"{name} has a default of its own: {fields[name].get('default')}"
			)
