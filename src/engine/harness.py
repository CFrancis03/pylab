# Shared grading helpers. Used verbatim by the Pyodide worker (browser) and by
# scripts/validate-content.ts (CPython), so what validates is what runs.
import json as _json

_results = []


def check(name, got, want):
    ok = got == want
    _results.append({"name": name, "ok": ok, "got": repr(got), "want": repr(want)})
    return ok


def check_true(name, cond):
    _results.append({"name": name, "ok": bool(cond)})
    return bool(cond)


def _report():
    print("\n__RESULTS__" + _json.dumps(_results))
