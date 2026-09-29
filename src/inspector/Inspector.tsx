import { useNavigate } from "@tanstack/react-router";
import type { DecisionResult } from "../decisions";
import type { PageSearch } from "../search";

type InspectorProps = {
  result: DecisionResult & { ignored: Record<string, string> };
  search: PageSearch;
};

export function Inspector({ result, search }: InspectorProps) {
  const navigate = useNavigate();
  const update = (key: keyof PageSearch, value: string) => {
    void navigate({
      to: ".",
      search: (previous) => ({ ...previous, [key]: value === "auto" ? undefined : value }),
    });
  };
  return (
    <aside className="inspector container" aria-label="Decision inspector">
      <details open>
        <summary>
          Decision inspector <span>Local experiment controls</span>
        </summary>
        <p className="inspector-note">
          Assignments are anonymous cookie-based when cookies are accepted. This demo does not track
          exposure or metrics.
        </p>
        <div className="inspector-controls">
          {(["arrival-flow", "destination-density"] as const).map((id) => (
            <label key={id}>
              {id}
              <select
                aria-label={`${id} assignment`}
                value={search[`exp.${id}`] ?? "auto"}
                onChange={(event) => update(`exp.${id}`, event.target.value)}
              >
                <option value="auto">Auto</option>
                <option value="control">Control</option>
                <option value="treatment">Treatment</option>
                {search[`exp.${id}`] &&
                  !["auto", "control", "treatment"].includes(search[`exp.${id}`] ?? "") && (
                    <option value={search[`exp.${id}`]}>Invalid: {search[`exp.${id}`]}</option>
                  )}
              </select>
            </label>
          ))}
          <label>
            Country{" "}
            <select
              aria-label="Visitor country"
              value={search.country ?? "auto"}
              onChange={(event) => update("country", event.target.value)}
            >
              <option value="auto">Auto (US)</option>
              <option value="US">US</option>
              <option value="IN">IN</option>
              {search.country && !["auto", "US", "IN"].includes(search.country) && (
                <option value={search.country}>Invalid: {search.country}</option>
              )}
            </select>
          </label>
          <label>
            Seasonal offers flag{" "}
            <select
              aria-label="Seasonal offers flag"
              value={search.offers ?? "auto"}
              onChange={(event) => update("offers", event.target.value)}
            >
              <option value="auto">Auto (off)</option>
              <option value="off">Off</option>
              <option value="on">On</option>
              {search.offers && !["auto", "off", "on"].includes(search.offers) && (
                <option value={search.offers}>Invalid: {search.offers}</option>
              )}
            </select>
          </label>
        </div>
        <p className="assignments">
          Assignments:{" "}
          {Object.entries(result.assignments)
            .map(([id, variant]) => `${id}: ${variant}`)
            .join(" · ")}
        </p>
        <dl className="decision-list">
          {Object.entries(result.values).map(([path, value]) => {
            const provenance = result.provenance[path as keyof typeof result.provenance];
            return (
              <div key={path}>
                <dt>{path}</dt>
                <dd>
                  <strong>{String(value)}</strong>
                  <span>
                    {provenance.source === "default"
                      ? "default"
                      : `${provenance.source}: ${provenance.id}${provenance.source === "experiment" ? ` / ${provenance.variant}` : ""}`}
                  </span>
                </dd>
              </div>
            );
          })}
        </dl>
        {Object.keys(result.ignored).length > 0 && (
          <p role="status" className="ignored">
            Ignored invalid overrides:{" "}
            {Object.entries(result.ignored)
              .map(([key, value]) => `${key}=${value}`)
              .join(", ")}
          </p>
        )}
      </details>
    </aside>
  );
}
