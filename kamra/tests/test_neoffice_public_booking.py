# //// Neoffice — added file (no upstream equivalent)
# Tests of the corrections to the public booking page of a hotel outside India: no leftover Indian deposit, a regional locale,
# the hotel's real country, and no online payment promised where the country has no gateway. Remove a test only with the
# change it guards (see NEOFFICE.md).
"""What a visitor of the public booking page of a hotel without a country pack is told."""

import frappe
from frappe.tests import IntegrationTestCase
from frappe.utils import add_days, nowdate

from kamra.public_api import _advance_terms, _public_locale, search_stay, showcase


class PublicBookingOutsideIndiaTestCase(IntegrationTestCase):
	def setUp(self):
		frappe.set_user("Administrator")  # nosemgrep: frappe-setuser -- test fixture
		frappe.local.lang = "en"
		self.property = self.hotel("Switzerland", city="Lausanne")
		self.ci, self.co = add_days(nowdate(), 5), add_days(nowdate(), 7)

	def hotel(self, country, **fields):
		name = frappe.get_doc({"doctype": "Property",
			"property_name": "TEST SP0 " + frappe.generate_hash(length=8),
			"country": country, "booking_engine_enabled": 1, **fields}).insert(ignore_permissions=True).name
		rt = frappe.get_doc({"doctype": "Room Type", "property": name, "room_type_code": "STD",
			"room_type_name": "Standard", "base_price": 1000, "adults_capacity": 2}).insert(ignore_permissions=True).name
		frappe.get_doc({"doctype": "Room", "property": name, "room_type": rt,
			"room_number": "101"}).insert(ignore_permissions=True)
		return name

	# ── the deposit ──────────────────────────────────────────────────────

	def test_a_new_hotel_asks_no_security_deposit(self):
		self.assertEqual(float(frappe.db.get_value("Property", self.property, "security_deposit_amount") or 0), 0)
		self.assertEqual(showcase(self.property)["property"]["security_deposit_amount"], 0)

	def test_a_deposit_the_hotel_sets_is_still_shown(self):
		frappe.db.set_value("Property", self.property, "security_deposit_amount", 300)
		self.assertEqual(showcase(self.property)["property"]["security_deposit_amount"], 300)

	# ── the locale ───────────────────────────────────────────────────────

	def test_a_swiss_hotel_that_books_in_french_gets_the_swiss_french_locale(self):
		frappe.db.set_value("Property", self.property, "booking_language", "fr")
		frappe.clear_cache()
		ui = _public_locale(self.property)
		self.assertEqual(ui["locale"], "fr-CH")
		self.assertEqual(ui["default_language"], "fr")

	def test_the_booking_language_picks_the_language_of_the_locale_and_the_country_its_region(self):
		frappe.db.set_value("Property", self.property, "booking_language", "de")
		frappe.clear_cache()
		self.assertEqual(_public_locale(self.property)["locale"], "de-CH")

	def test_a_hotel_with_no_booking_language_keeps_the_guests_browser_language_but_still_a_swiss_region(self):
		frappe.db.set_value("Property", self.property, "booking_language", "")
		frappe.clear_cache()
		ui = _public_locale(self.property)
		self.assertTrue(ui["locale"].endswith("-CH"), ui["locale"])
		self.assertIsNone(ui["default_language"])

	def test_an_amount_in_letters_symbol_is_set_apart_from_the_figure(self):
		frappe.db.set_value("Currency", "CHF", "symbol", "CHF")
		frappe.db.set_value("Property", self.property, "currency", "CHF")
		frappe.clear_cache()
		self.assertEqual(_public_locale(self.property)["currency_symbol"], "CHF ")

	def test_a_country_with_a_pack_keeps_its_own_locale(self):
		india = self.hotel("India")
		self.assertEqual(_public_locale(india)["locale"], "en-IN")

	# ── the country ──────────────────────────────────────────────────────

	def test_the_page_names_the_hotels_country_by_its_iso_code(self):
		self.assertEqual(showcase(self.property)["property"]["country_code"], "CH")

	def test_an_unknown_country_claims_no_code(self):
		frappe.db.set_value("Property", self.property, "country", "Nowhere Land")
		frappe.clear_cache()
		self.assertIsNone(showcase(self.property)["property"]["country_code"])

	# ── online payment ───────────────────────────────────────────────────

	def prime(self, mode, **fields):
		frappe.db.set_value("Property", self.property,
			{"booking_payment_mode": mode, "advance_percent": 30, "registration_fee": 50, **fields})
		frappe.clear_cache()

	def test_a_country_without_a_gateway_takes_no_payment_online_whatever_the_setting(self):
		for mode in ("Advance percent", "Registration fee", "Full online"):
			self.prime(mode)
			self.assertEqual(showcase(self.property)["property"]["payment_mode"], "Pay at hotel", mode)
			self.assertEqual(_advance_terms(frappe.get_doc("Property", self.property), 378)[0], 0.0, mode)

	def test_a_stay_quote_asks_nothing_now_where_no_gateway_exists(self):
		self.prime("Advance percent")
		row = search_stay(self.property, self.ci, self.co, 2, 0)[0]
		self.assertEqual(row["quote"]["advance_due"], 0)
		self.assertTrue(all(not p.get("advance_due") for p in row["plans"]))

	def test_a_season_that_asks_full_payment_cannot_ask_it_online_either(self):
		self.prime("Advance percent")
		prop = frappe.get_doc("Property", self.property)
		self.assertEqual(_advance_terms(prop, 378, {"full_payment": True, "advance_percent": 50})[0], 0.0)

	def test_a_country_with_a_gateway_keeps_the_payment_setting(self):
		india = self.hotel("India")
		frappe.db.set_value("Property", india, {"booking_payment_mode": "Advance percent", "advance_percent": 30})
		frappe.clear_cache()
		self.assertEqual(showcase(india)["property"]["payment_mode"], "Advance percent")
		due, _policy = _advance_terms(frappe.get_doc("Property", india), 1000)
		self.assertEqual(due, 300.0)
