//// Neoffice — added file (no upstream equivalent): what the restaurant's till put on the rooms, for the reception.
// The restaurant (a till of the same site) invoices a meal itself and puts it on the guest's bill as a transit line: the guest pays it with
// the bill at departure. The reception reads here, per stay in house, which meals are waiting and what each stay owes for them. Read only:
// a meal is moved or taken off from the invoice history of the till. The hotel app answers (`neohotel.till_plug.api.to_collect`); a site
// without it, or an account it refuses, draws nothing.
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { call, getCurrentProperty } from "../lib/api"
import { fmtMoney, moneyLocale } from "../lib/money"
import { uiDateLocale, useT } from "../lib/i18n"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { DataTable } from "./ui/data-table"

type Meal = { invoice: string; amount: number; till: string; at: string }
type Stay = { reservation: string; room_number: string; guest_name: string; folio: string; amount: number; meals: Meal[] }

const when = (d: string) =>
  d
    ? new Date(d.replace(" ", "T").slice(0, 19)).toLocaleString(uiDateLocale(moneyLocale()), {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : ""

export function MealsOnTheRooms() {
  const { t } = useT()
  const navigate = useNavigate()
  const [stays, setStays] = useState<Stay[]>([])

  useEffect(() => {
    call<Stay[]>("neohotel.till_plug.api.to_collect", { property: getCurrentProperty() })
      .then((rows) => setStays(Array.isArray(rows) ? rows : []))
      .catch(() => setStays([]))
  }, [])

  if (!stays.length) return null
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{t("Meals on the rooms")}</CardTitle>
          <p className="mt-0.5 text-xs text-zinc-400">
            {t("Put on the bill by the restaurant's till and already invoiced there. The guest pays them with the bill at departure. To move one to another room or take it off, use the invoice history of the till.")}
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <DataTable<Stay>
          id="billing.meals_on_the_rooms" exportName="meals-on-the-rooms" rows={stays} rowKey={(s) => s.reservation}
          onRowClick={(s) => navigate(`/billing/${encodeURIComponent(s.folio)}`)}
          columns={[
            { key: "room_number", label: t("Room"), render: (s) => <span className="font-medium">{s.room_number}</span> },
            { key: "guest_name", label: t("Guest") },
            {
              key: "meals",
              label: t("Meals"),
              noSort: true,
              value: (s) => s.meals.map((m) => `${m.invoice} ${m.till} ${fmtMoney(m.amount)}`).join("; "),
              render: (s) => (
                <ul className="space-y-0.5 text-xs text-zinc-500">
                  {s.meals.map((m) => (
                    <li key={m.invoice}>
                      <span className="font-mono">{m.invoice}</span>
                      {m.till ? ` · ${m.till}` : ""}
                      {m.at ? ` · ${when(m.at)}` : ""}
                      {` · ${fmtMoney(m.amount)}`}
                    </li>
                  ))}
                </ul>
              ),
            },
            { key: "amount", label: t("Owed"), align: "right", render: (s) => <span className="font-medium">{fmtMoney(s.amount)}</span> },
          ]}
        />
      </CardContent>
    </Card>
  )
}
