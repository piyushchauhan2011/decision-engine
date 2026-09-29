import type { RefObject } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { experiments } from "../decisions";
import type { DecisionResult } from "../decisions";
import type { PageSearch } from "../search";

type InspectorProps = {
  result: DecisionResult & { ignored: Record<string, string> };
  search: PageSearch;
};

export function Inspector({ result, search }: InspectorProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const launcherRef = useRef<HTMLButtonElement>(null);
  const filterRef = useRef<HTMLInputElement>(null);
  const ignoredCount = Object.keys(result.ignored).length;

  useEffect(() => {
    if (open) filterRef.current?.focus();
  }, [open]);

  const close = () => {
    setOpen(false);
    launcherRef.current?.focus();
  };
  const update = (key: keyof PageSearch, value: string) => {
    void navigate({
      to: ".",
      search: (previous) => ({ ...previous, [key]: value === "auto" ? undefined : value }),
    });
  };

  return (
    <div className="inspector-dock">
      <button
        ref={launcherRef}
        type="button"
        className="inspector-launcher"
        aria-expanded={open}
        aria-controls="decision-inspector-panel"
        onClick={() => (open ? close() : setOpen(true))}
      >
        Decision inspector
        {ignoredCount > 0 && <span className="inspector-alert">{ignoredCount} ignored</span>}
      </button>
      <aside
        id="decision-inspector-panel"
        className="inspector-panel"
        aria-label="Decision inspector"
        hidden={!open}
        onKeyDown={(event) => {
          if (event.key === "Escape") close();
        }}
      >
        <div className="inspector-header">
          <div>
            <h2>Decision inspector</h2>
            <span>Local experiment controls</span>
          </div>
          <button
            type="button"
            className="inspector-close"
            aria-label="Close decision inspector"
            onClick={close}
          >
            Close
          </button>
        </div>
        <div className="inspector-body">
          <ExperimentControls
            result={result}
            search={search}
            filter={filter}
            setFilter={setFilter}
            filterRef={filterRef}
            update={update}
          />
          <VisitorControls search={search} update={update} />
          {ignoredCount > 0 && (
            <p role="status" className="ignored">
              Ignored invalid overrides:{" "}
              {Object.entries(result.ignored)
                .map(([key, value]) => `${key}=${value}`)
                .join(", ")}
            </p>
          )}
          <ResolvedDecisions result={result} />
          <p className="inspector-note">
            Assignments use an anonymous cookie when accepted. This demo does not track exposure or
            metrics.
          </p>
        </div>
      </aside>
    </div>
  );
}

type UpdateOverride = (key: keyof PageSearch, value: string) => void;

function ExperimentControls({
  result,
  search,
  filter,
  setFilter,
  filterRef,
  update,
}: InspectorProps & {
  filter: string;
  setFilter: (value: string) => void;
  filterRef: RefObject<HTMLInputElement | null>;
  update: UpdateOverride;
}) {
  const matchingExperiments = experiments.filter(({ id }) =>
    id.toLowerCase().includes(filter.trim().toLowerCase()),
  );
  return (
    <section className="inspector-section" aria-labelledby="inspector-experiments">
      <h3 id="inspector-experiments">
        Experiments{" "}
        <span>
          {matchingExperiments.length} of {experiments.length}
        </span>
      </h3>
      <label className="inspector-filter">
        Filter experiments
        <input
          ref={filterRef}
          type="search"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Search by experiment ID"
        />
      </label>
      <div className="inspector-experiment-list">
        {matchingExperiments.map(({ id }) => (
          <label className="inspector-experiment" key={id}>
            <span className="inspector-experiment-heading">
              <span>{id}</span>
              <span className="inspector-assignment">Assigned: {result.assignments[id]}</span>
            </span>
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
        {matchingExperiments.length === 0 && (
          <p role="status" className="inspector-empty">
            No experiments match “{filter}”.
          </p>
        )}
      </div>
    </section>
  );
}

function VisitorControls({ search, update }: { search: PageSearch; update: UpdateOverride }) {
  return (
    <details className="inspector-section inspector-context" open>
      <summary>Visitor and flags</summary>
      <div className="inspector-controls">
        <label>
          Country
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
          Seasonal offers flag
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
        <label>
          Planning guide flag
          <select
            aria-label="Planning guide flag"
            value={search.guide ?? "auto"}
            onChange={(event) => update("guide", event.target.value)}
          >
            <option value="auto">Auto (off)</option>
            <option value="off">Off</option>
            <option value="on">On</option>
            {search.guide && !["auto", "off", "on"].includes(search.guide) && (
              <option value={search.guide}>Invalid: {search.guide}</option>
            )}
          </select>
        </label>
      </div>
    </details>
  );
}

function ResolvedDecisions({ result }: { result: InspectorProps["result"] }) {
  return (
    <details className="inspector-section inspector-decisions">
      <summary>Resolved decisions ({Object.keys(result.values).length})</summary>
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
    </details>
  );
}
