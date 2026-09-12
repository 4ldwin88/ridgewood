# v0.30 register controls

This release fixes printing and shared controls before expanding the delivery lifecycle.

- Print only the selected immutable publication in a separate document, avoiding hidden application layout and its blank pages. Browser regression renders the PDF and checks each page contains text.
- Standardize required/optional badge positioning, size and theme colors.
- Put photos and management menus together on register cards. Stage bars show lifecycle position, not work completion.
- Open authorized project details before accessing the frozen authorization record.
- Show pipeline stage distribution from active records and an explicitly pending AI summary.
- Keep all four Business stage buttons in one row.
- Add organization removal/restoration through the existing workspace-scoped update policy. Removal hides choices, preserves linked identities, and remains reversible. No existing organization is automatically removed.

Database: one additive `organizations.is_retired` column. The database contract tests member updates, outsider isolation, preserved project links and restoration. Existing active forms continue to display a previously selected retired organization.

Delivery lifecycle expansion remains paused for owner testing of this release.
