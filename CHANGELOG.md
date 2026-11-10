# Changelog

Every notable change to this theme, newest first.

## 2026-11-10 — Conversion configuration and button icons

- New dependency `lucide-react` `^1.70.0` for icons.
- New `src/components/ConversionDialog.tsx`: a dialog that asks the customer for their details (the fields come from the conversion configuration). It is used for the conversion locations, for quotes and for the "Your details" button.
- `PageHandler.tsx`: the conversion configuration's locations are now honoured. Details are asked for at the start (first visit to the personalise page) and at the end (before finishing), once per location and never when the bundle already has an owner. `Manual` adds a "Your details" button to the stepper bar so the customer can add or change their details at any time. Details are saved as the bundle owner (replacing the owner, keeping other stakeholders), in the bundle metadata, and as its organization. Mandatory prompts cannot be skipped.
- `QuoteForm.tsx`: exports `fieldId`, and is now shown inside `ConversionDialog` instead of inline on the finish step.
- `FinishUI.tsx`: "Request a quote" now opens the dialog through `onRequestQuote()`, which no longer takes the details. It resolves `false` if the customer cancels, so they can carry on designing.
- `Customization/index.tsx`: updated to pass the new quote handler.
- `PageStepper.tsx`: new optional `actions` prop, shown after a divider beside the steps. The completed-step tick is now a `lucide-react` icon.
- `button.tsx`: new optional `icon` prop, shown after the label.
- `FinishUI.tsx`, `FrameUI.tsx`: icons added to the buttons (download, add to cart, quote, upload, replace, remove, background removal, optimise, mobile upload and others).

## 2026-11-09 — Bug fixes and core code consolidation (#11)

Commit `85c2547`.

- Updated `@spiffcommerce/core` from `44.16.3-alpha.0` to `44.19.0`.
- Removed the `qrcode` and `@types/qrcode` packages. `MobileUploadQR.tsx` is simpler and no longer draws the QR code itself.
- New setting `VITE_EDITOR_URL` in `.env.sample`: the editor address that the mobile upload QR code links to.
- New `src/components/ConfirmReplaceDialog.tsx`: asks the customer to confirm before replacing something they have already added.
- `FrameUI.tsx` (photo frame step): reworked to use the new confirm dialog and other fixes.
- `PageHandler.tsx`, `App.tsx`, `index.tsx`, `index.css`: bug fixes and code consolidation.
- `configurationSchema.ts`: one new setting (15 lines changed).

## 2026-11-05 — Place order and customisation features

- New `QuoteForm.tsx` and `TestOrderBanner.tsx`: a quote form and a banner that marks test orders.
- `FinishUI.tsx`, `Customization/index.tsx`, `PageHandler.tsx`, `App.tsx`: place-order flow.
- `configurationSchema.ts`: more theme settings for the above.
- `README.md`: updated.

## 2026-11-05 — New 3D preview package

- Replaced `@spiffcommerce/preview` `5.12.0` with `@spiffcommerce/preview-3d` `6.0.0`.
- Updated `ThreeDPreview.tsx` and `vite.config.ts` to match.

## 2026-10-30 — Basic mobile layout

- `Customization/index.tsx`, `PageStepper.tsx`, `SelectorContainer.tsx`, `SelectorTile.tsx`: a first mobile layout for phones. It is a starting point, not the final responsive rules (those are still an open item).

## 2026-10-29 — All step types implemented

- Every Spiff step type now has a screen in `src/Pages/Customization/Steps/` (digital content, finish, frame, illustration, material, model, module, picture, question, shape, text).
- New building blocks in `Customization/components/`: `ImageCropper`, `MobileUploadQR`, `SVGColorSelector`, `StepHelp`, `VariantGallery`, `colorIsolation`, `customColor`, plus `downloadPreview.ts`.
- New in `Pages/components/`: `ExperienceSwitcher`, `PageStepper`. New in `components/`: `ErrorBanner`, `ErrorScreen`.
- `PageHandler.tsx`, `App.tsx`: expanded page flow.
- `configurationSchema.ts`, `hooks/useTheme.tsx`, new `hooks/useThemeConfiguration.tsx`: many more configurable theme settings.

## 2026-10-28 — Imported into client-themes

- The theme was added to the client-themes repository as its template, with a placeholder README and `package.json` scripts for theme management.
