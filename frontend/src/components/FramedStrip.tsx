//// Neoffice — added file (no upstream equivalent).
//
// The application's own menu, in the frame of a tab of the desk's Hotel space: the desk's tabs open the main screens, and
// this strip is the rest of the application's menu - the area the reader is in (Front Desk, Housekeeping, Revenue...)
// and the screens of that area - in one row, where the side menu was. Same screens, same rights as the side menu
// (itemVisible), minus what the Hotel space leaves out (lib/framed.ts).
import { NavLink, useNavigate } from "react-router-dom"

import { FRAMED_HIDDEN_APPS, FRAMED_HIDDEN_ROUTES } from "../lib/framed"
import { useT } from "../lib/i18n"
import { cn } from "../lib/utils"
import { itemVisible, type AppDef, type AppNavItem } from "../lib/apps"
import { useAuth } from "../lib/auth"

interface Props {
  apps: AppDef[]
  current: AppDef
}

export default function FramedStrip({ apps, current }: Props) {
  const { roles, can } = useAuth()
  const { t } = useT()
  const navigate = useNavigate()
  const areas = apps.filter((a) => !FRAMED_HIDDEN_APPS.includes(a.id))
  const items = (current?.items ?? []).filter(
    (item) =>
      itemVisible(item, roles, can) &&
      !(item.to && FRAMED_HIDDEN_ROUTES.includes(item.to)) &&
      !(item.href && !item.href.startsWith("/kamra/")),
  )
  return (
    <nav
      aria-label={t("Screens")}
      className="mb-4 flex min-w-0 flex-nowrap items-center gap-1.5 overflow-x-auto whitespace-nowrap border-b border-zinc-200 pb-3 text-sm sm:flex-wrap sm:overflow-visible"
    >
      {areas.length > 1 ? (
        <label className="me-2 flex items-center gap-1.5 text-zinc-500">
          <span className="sr-only">{t("Area")}</span>
          <select
            className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm font-medium text-zinc-800"
            value={current?.id}
            onChange={(e) => {
              const next = areas.find((a) => a.id === e.target.value)
              const first = next?.items.find(
                (i) => i.to && itemVisible(i, roles, can) && !FRAMED_HIDDEN_ROUTES.includes(i.to),
              )
              if (first?.to) navigate(first.to)
            }}
          >
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {t(a.name)}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {items.map((item: AppNavItem) =>
        item.href ? (
          <a
            key={item.href}
            href={item.href}
            target="_blank"
            rel="noreferrer"
            className="rounded-full px-3 py-1 font-medium text-zinc-600 hover:bg-zinc-100"
          >
            {t(item.label)}
          </a>
        ) : (
          <NavLink
            key={item.to}
            to={item.to!}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "rounded-full px-3 py-1 font-medium",
                isActive ? "bg-brand-50 text-brand-700" : "text-zinc-600 hover:bg-zinc-100",
              )
            }
          >
            {t(item.label)}
          </NavLink>
        ),
      )}
    </nav>
  )
}
