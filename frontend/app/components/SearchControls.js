"use client";

export default function SearchControls({ values, onChange, onSubmit, advanced = true, submitting = false }) {
  return (
    <form className="search-form" onSubmit={onSubmit}>
      <label className="field-label" htmlFor="search-title">Search by title</label>
      <input id="search-title" value={values.title} onChange={(event) => onChange("title", event.target.value)} placeholder="e.g. remote work policy" />
      {advanced && <div className="two-column-fields">
        <div><label className="field-label" htmlFor="search-tag">Tag</label><input id="search-tag" value={values.tag} onChange={(event) => onChange("tag", event.target.value)} placeholder="e.g. finance" /></div>
        <div><label className="field-label" htmlFor="search-uploader">Uploader</label><input id="search-uploader" value={values.uploader} onChange={(event) => onChange("uploader", event.target.value)} placeholder="Name or email" /></div>
      </div>}
      <button className="secondary-button" type="submit" disabled={submitting}>{submitting ? "Searching..." : "Search documents"}</button>
    </form>
  );
}
