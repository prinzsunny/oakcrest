"""Convert the Marble Skill Taxonomy (https://github.com/withmarbleapp/os-taxonomy) into small JS data files.

Usage: python3 -I tools/marble-import.py <path to os-taxonomy checkout>
Writes assets/marble/index.js and one file per subject. Content is unchanged apart from format;
it stays under ODbL 1.0 (database) and CC BY-SA 4.0 (Marble's text), as the header of each file says.
"""
import json
import pathlib
import sys

src = pathlib.Path(sys.argv[1]) / "data"
out = pathlib.Path(__file__).resolve().parent.parent / "assets" / "marble"
out.mkdir(parents=True, exist_ok=True)

topics = json.loads((src / "topics.json").read_text())
deps = json.loads((src / "dependencies.json").read_text())["dependencies"]
clusters = json.loads((src / "clusters.json").read_text())["clusters"]
version = topics.get("version", "v1")

HEADER = (
    "/* Marble Skill Taxonomy ({v}) · © Generative Spark, Inc. (Marble) · https://withmarble.com\n"
    "   Database: ODbL 1.0 (https://opendatacommons.org/licenses/odbl/1-0/). Marble's text: CC BY-SA 4.0.\n"
    "   Source: https://github.com/withmarbleapp/os-taxonomy. Converted to JS by tools/marble-import.py; content unchanged.\n"
    "   Standards codes refer to: Common Core (© 2010 NGA Center and CCSSO); the National Curriculum in England\n"
    "   (contains public sector information licensed under the Open Government Licence v3.0); NGSS (NGSS is a\n"
    "   registered trademark of WestEd, which was not involved in and does not endorse this product); C3; IB PYP. */\n"
).format(v=version)

SLUG = {
    "Mathematics": "math",
    "English": "english",
    "Science": "science",
    "History": "history",
    "Personal & Social Development": "social",
    "Life Skills": "life",
    "Computing": "computing",
    "Learning to Learn": "learning",
}
by_subject = {}
subject_of = {}
for t in topics["topics"]:
    subject_of[t["id"]] = t["subject"]
    by_subject.setdefault(t["subject"], []).append(
        [t["id"], t["domain"], t["name"], t["type"], t["ageRangeStart"], t["ageRangeEnd"], t["description"], t["evidence"], t["assessmentPrompt"], t["standards"], round(t.get("centrality") or 0, 4)]
    )
deps_by_subject = {}
for d in deps:
    deps_by_subject.setdefault(subject_of[d["topicId"]], []).append([d["topicId"], d["prerequisiteId"], 1 if d["strength"] == "hard" else 0, d["reason"]])

subjects = []
for subject, rows in by_subject.items():
    slug = SLUG[subject]
    rows.sort(key=lambda r: (r[1], r[4], r[2]))
    data = {"subject": subject, "topics": rows, "deps": deps_by_subject.get(subject, [])}
    (out / f"{slug}.js").write_text(HEADER + "MARBLE.add(" + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ");\n")
    subjects.append({"name": subject, "slug": slug, "count": len(rows)})

index = {
    "version": version,
    "attribution": "Marble Skill Taxonomy (" + version + ") · © Generative Spark, Inc. (Marble) · https://withmarble.com · licensed under ODbL 1.0 (database) and CC BY-SA 4.0 (content).",
    "fields": ["id", "domain", "name", "type", "ageStart", "ageEnd", "description", "evidence", "prompt", "standards", "centrality"],
    "subjects": sorted(subjects, key=lambda s: -s["count"]),
    "clusters": [[c["subject"], c["domain"], c["ageRangeStart"], c["summary"]] for c in clusters],
}
(out / "index.js").write_text(HEADER + "window.MARBLE_INDEX = " + json.dumps(index, ensure_ascii=False, separators=(",", ":")) + ";\n")
for f in sorted(out.iterdir()):
    print(f.name, f.stat().st_size)
