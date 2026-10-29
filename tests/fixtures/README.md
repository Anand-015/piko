# Synthetic fixtures

`form-fixture.html` exercises the Step 5 scanner with fictional prefilled values,
all supported field types, label priorities, exclusions, repeated radio labels,
and conditional/replaced controls. `empty-fixture.html` has no form fields.

From the repository root:

```bash
python3 -m http.server 8787 --bind 127.0.0.1 --directory tests/fixtures
```

Open `http://127.0.0.1:8787/form-fixture.html`, click Piko's Chrome toolbar icon,
and choose **Inspect this page**. See `docs/06-form-scanner.md` for the full test flow.
The original Step 2 contract payloads and HTML forms remain in `test/fixtures/`.
