# Changelog

Every notable change to this theme, newest first.

## 2026-11-13 — Multiple workflow experiences (cart)

- The journey is now **collection → products → personalise → review → thank you**. The separate "Design" (workflow selector) page is gone.
- The **collection page is skipped when there is only one collection**: it is selected automatically. If that fails, the collection page is shown so the customer can retry.
- The **product page has a cart on the side** (below the products on narrow screens). A product's Select button adds a design to the bundle; when the product has more than one workflow the button opens a dropdown of workflow names (`components/DropdownButton.tsx`). Products can be added repeatedly, and each cart line can be removed. Continue opens the personalise page, where the existing experience switcher moves between the designs.
- Each cart line has a **quantity control** (− / typed value / +, minimum 1, applied on blur or Enter via `setQuantity`). Line prices and the total are multiplied by quantity.
- Cart prices follow each workflow's `showPricing` flag, and the total is only shown when every line's price is. Products added by a product step are not listed in the cart.
- The experience switcher lists top-level designs only; products added by a product step appear as smaller chips in a row beneath, and only while their parent or one of its siblings is selected. The parent's tab gets a thicker outline while one of its children is selected.
- The **review page lists every item in the cart**, each with its own preview image (made one at a time, as they share the 3D scene), name, quantity, line price (the price without a price break is struck through when one applies) and the details of each step with their price modifiers. Products added by a product step have no row or image of their own: they are listed under their parent in an "Includes" section with quantity, price and details. The total includes the added products (they are separate transactions that core prices separately) and, like the cart, is only shown when every price is. `Customization`'s `onSummaryChanged` prop is removed, as the review page reads each design's details itself.
- Fixed 3D screenshots (review page and the final preview image) sometimes being taken before the design's layouts had been drawn onto the model. `waitForTextures` relied on each layout's "last completed render", which is still set from earlier although the model's textures are new and blank, and which core also sets when a render has no canvas to draw to yet. It now asks each layout that is drawn to the model for a fresh render and waits for that one.
- **Single product mode** (`activation.singleProductMode`) keeps the previous flow instead of the cart: collection → product → design (only when the product has several workflows) → personalise, where choosing a different product or design replaces the current one after a confirmation. This uses `ProductSelector/SingleProductSelector.tsx` and `WorkflowSelector`, and the experience switcher shows products added by a product step in the same row as their parent. Both modes still skip the collection page when there is only one collection.
- Changing collection with a non-empty cart asks for confirmation, then removes every design in the bundle.
- Not handled yet: workflow prices in the dropdown (core's `ProductWorkflow` has no price or `showPricing` before an experience exists), per-product minimum order quantities, a combined review of all designs, and a polished multi-experience customisation page.

## 2026-11-13 — Product steps, and hiding single-variant steps

- New **product step** (`Steps/ProductUI.tsx`): a gallery of the step's products (with the step's search and category settings). Choosing one adds a child transaction to the bundle (or raises the quantity of a non-personalisable product). Added products are listed above the gallery with a Remove button and, for personalisable products, a Personalise button that opens that product's experience (use the experience switcher to come back). The step's maximum disables the gallery once reached, and the minimum is checked when finishing or requesting a quote.
- `PageHandler.tsx` now listens for experiences being added to or removed from the bundle, so the experience switcher stays current. `Customization` has a new `onOpenExperience` prop.
- When a personalisable product is added more than once, the new transaction is renamed before it is shown ("Name (2)", via `nameTransaction`) so the copies can be told apart. The product list and experience switcher show a transaction's `designName` when it has one.
- Not handled yet: the step's pricing mode and locked add-ons (`getLockedAddOns()`). Child product prices aren't included in the total shown.
- Steps that are only a choice of variant (material, model, picture, question) are hidden when they have a single variant and it is already selected, as in Beeline. A scene whose steps are all hidden is hidden too. Text, shape, illustration and frame steps are never hidden, as they have more to them than the variant choice. To change this, edit the check in `StepHandler` in `Customization/index.tsx`.

## 2026-11-11 — Responsive layout for phones and tablets

- New `src/layout.ts`: the single source of truth for responsive layout. Orientation decides the layout mode (**stacked**: preview above the steps, in portrait or under 700px wide; **split**: preview beside the steps, in landscape from 700px) and width decides the size tier (compact under 600, medium 600–1023, expanded from 1024). A **short** modifier (height 500px or less) covers phones in landscape. Exports `MEDIA` (the media query strings) and the sidebar width bounds.
- New `src/hooks/useLayout.ts`: `useMediaQuery`, `useLayoutMode` and `useKeyboardViewportHeight` (the visible height while the on-screen keyboard is open for a text field). CSS media queries are still preferred wherever JavaScript isn't needed.
- `Customization/index.tsx`:
  - Stacked: the preview is pinned on top at about 4:3 (clamped to 32–42dvh on phones, 40–50dvh on tablets in portrait) and the steps scroll below it. Scene titles stick to the top while their scene scrolls. When the keyboard is open for a text field the layout matches the visible area and the preview collapses to a thin strip.
  - Split: the sidebar uses `sidebarWidthPercentage`, now clamped to 360–560px (400px minimum on touch screens). Phones in landscape and 700–1023px landscape screens use a fixed 55/45 preview/sidebar split instead.
  - New sticky action bar in stacked and short layouts, with the total and a Review (or add to cart) button that scrolls to the finish step. It replaces the sticky total bar there, and collapses out of the way once the finish step is in view.
- `PageStepper.tsx`: the steps scroll horizontally when they don't fit, and the current page is kept centred (smoothly, except on first load and with reduced motion). On short landscape screens the steps collapse to "Step n of m" with a back button.
- `PageStepper.tsx`, `SelectorContainer.tsx`, `SelectorTile.tsx`, `Review/index.tsx`: the hard-coded 768px queries now use the compact tier (under 600px), so tablets in portrait get the roomier layout.
- `index.css`: on touch screens buttons have a minimum size of 44px (zero specificity, so components can still size their own).

## 2026-11-10 — Review and thank you pages

- New optional **Review** page (`src/Pages/Review/index.tsx`), after Personalise: a preview image, the design's chosen options and the price, with a button (using the "Add to Cart Button Text" setting) that completes the design. Switched on with the "Review" page toggle in the dashboard's page settings (off by default).
- New optional **Thank you** page (`src/Pages/ThankYou/index.tsx`), the last page: a customisable message and a button that leaves the experience. It doesn't need the review page. Switched on with the "Thank You" page toggle in the dashboard's page settings (off by default), with the new `thankYouMessage` and `thankYouCloseLabel` settings. Once it is reached, earlier pages can no longer be returned to.
- Hand-off with the thank you page: the page *prepares* the hand-off as it loads (finishes the bundle, and places the order for test orders) and the button performs it (adds to the cart, or closes the window for test orders). Requesting a quote also opens the page; it saves the customer's details and generates the quote number, but doesn't finish the bundle or call `completeQuote` yet, and the button just closes the experience. Without the thank you page everything happens as before, when the previous page continues.
- The thank you page shows the order number of a test order (placed directly by the theme), as it does the quote number. Regular e-commerce hand-offs show neither. A comment on `enableTestOrders` and where the order is placed notes that the platform allows applications to create orders, but this theme only does so for testing.
- Preview images for `bundle.finish` and the review page are only taken for the first experience, and come from the 3D scene when the workflow has `showModelOnFinishStep` and a finish camera (otherwise from its 2D layouts). New `Customization/previewScreenshot.ts`: if the experience is already on screen its preview is used as it is, if another experience is on screen a 2D image is used instead, and otherwise the model is loaded into the shared preview service for the screenshot and ejected afterwards. While loaded it is given a hidden view so the render loop runs (which is what puts the design onto the model's textures), and the design's textures and the environment are awaited before the screenshot. `ThreeDPreview.tsx` now exports `getPreviewService`.
- `configurationSchema.ts`: two new settings, and new toggleable "Review" and "Thank You" pages in the page settings. `useThemeConfiguration.tsx`: new `usePageEnabled(pageKey)` hook, which reads a page's toggle (falling back to the page's default).
- `PageHandler.tsx`: the stepper includes the enabled optional pages, and finishing Personalise goes to the review page when it's enabled.
- With the review page on, "Request a Quote" moves from the Personalise finish step to the review page, next to the complete button. Personalise then only has "Review your design" (always shown, even when carts are switched off). New `useCheckoutOptions()` hook shares the cart/quote rules.
- `Customization/index.tsx`: new `onSummaryChanged` prop, used to pass the design's details to the review page.

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
