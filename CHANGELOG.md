# Changelog

Every notable change to this theme, newest first.

## 2026-11-18 — Signing out when saving and exiting is optional

- A signed in customer saving and exiting chooses whether to be signed out, with a **Sign me out when I exit** option in the panel. It's **unticked to begin with**, so they stay signed in unless they say otherwise, and it isn't shown to guests, who have nothing to sign out of. Unticked, and when the theme isn't in a frame, the next design starts on a new bundle under their account; in a frame the experience closes either way, without starting a bundle that nobody would use.
- New **User Portal: Allow Staying Signed In** setting (on by default). Turned off, customers are **always** signed out as they leave, which suits shared screens such as kiosks: the panel just says "You'll be signed out when you exit." instead of offering the choice, and starting a new order from the thank you page signs them out as well (it leaves them signed in when the setting is on). Signing out from the account menu and the inactivity timeout always sign out and start over, whatever this is set to.
- `useAccount().signOut` takes `{ startNewBundle: false }` for the case where the experience is about to close.

## 2026-11-18 — The conversion configuration with the user portal

- The user portal no longer **completely** replaces the conversion configuration. With both on, the configuration's details are asked for **inline on the review page** (a "Your details" section above the terms and buttons), or, when the review page is off, in a **popup just before the design is finalised**. Its own locations (start, end and manual) don't apply with the portal, and there's no "Your details" button on the stepper bar.
- **They start with what's known:** a value already saved on the bundle, then the signed in customer's email, first name, last name and phone number (or failing that the bundle owner's). A signed in customer's email address is shown but can't be changed. The details are saved to the bundle as before (its owner, its metadata and its organization), when the design is completed. They aren't written back to the customer's account; that's what **Your details** in the account menu is for.
- **Required or not:** as the configuration says. Where it's marked mandatory the design can't be completed (the review page's button is disabled, or the popup can't be skipped) until the fields it marks as mandatory are filled in; otherwise they can be left out. A **quote** always needs them.
- **Quotes** with the portal on now use these details too (so a guest can request one without signing in, as long as the configuration asks for details), and without a conversion configuration still ask a guest to sign in as before.
- Changed: `QuoteForm`'s fields moved to `ConversionFields`, and `utils/conversionDetails` holds the pre-filling and the check for what's missing. The `enableUserPortal` setting's description and the conversion configuration's now say all this.

## 2026-11-18 — Customers can update their own details

- The account menu has a **Your details** page where a signed in customer can change their first name, last name and phone number, using `SpiffCommerceClient.updateCustomer` (core 44.21.1-alpha.2). Their email address is shown but can't be changed, as it's how they sign in. An update isn't partial in core, so all three are always sent, and one which has been emptied is cleared; the customer kept by the account (and shown in the form) is the one the server returns. The customer's default template is kept by core.

## 2026-11-18 — Save branding as a template when saving and exiting

- The **Save and exit** panel has an **Also save my branding as a template** option (off to begin with, and only for a signed in customer when the design has shared options, as saved branding does; core won't make a template for a guest who has only given their email address). The template is saved under the **order's name** (there's no separate name for it, as templates are listed apart from orders), so ticking it needs the order to have one, and the panel says so while it doesn't. It saves the design's shared options as saved branding after the draft's name, then leaves. If the template can't be saved the panel stays open with a message, and trying again doesn't make it twice; unticking it saves the draft without one.

## 2026-11-18 — Server addresses come from the region

- `@spiffcommerce/theme-bridge` now supplies the Spiff Commerce server, hub, services API and editor addresses itself, chosen by **`VITE_SPIFF_REGION`** (`au` or `us`), so `.env.sample` sets only that. `VITE_SERVER_URL`, `VITE_HUB_URL`, `VITE_SERVICES_URL` and `VITE_EDITOR_URL` are no longer advertised, as they're for internal use only; each is still read, and still wins over the region's default if it's set. This replaces the `VITE_EDITOR_URL` setting added in the mobile upload entry below.
- `App` no longer configures the client from those variables itself in development. It always calls `SpiffThemeLoader.configureClient`, which applies the same addresses together with the login settings, and no longer sets the editor address either (the bridge does).
- The region also supplies the login settings (`VITE_USER_POOL_CLIENT_ID` and `VITE_AWS_REGION` default from it), which the user portal's sign-in uses.

## 2026-11-18 — Local configuration is loaded by theme-bridge

- Loading the local development configuration is now done by the theme plugin in `@spiffcommerce/theme-bridge` (updated to 1.29.1-alpha.0) rather than by this theme's own code. `vite.config.ts` no longer reads the file or sets `__LOCAL_DEV_CONFIGURATION__` itself, and no longer lists the files for `vite-plugin-restart` to watch. (`localConfiguration.ts`, the first version of this, has been removed.)
- The behaviour is the same, and JSONC is supported: **`.env.<mode>.jsonc`** (comments and trailing commas allowed) is used first, and failing that `.env.<mode>.json`. A file which can't be parsed stops the dev server with "Failed to parse development configuration" and the file's path, and the dev server restarts when either kind of file is added, changed or removed in the project's root folder.
- The plugin only sets `__LOCAL_DEV_CONFIGURATION__` if `vite.config.ts` hasn't defined it, and loading can be switched off with the plugin's `loadDevelopmentConfiguration: false` option.

## 2026-11-18 — "Corporate portal" is now the "user portal"

- Renamed everywhere it's shown or named: the settings now read **Enable User Portal** and **User Portal: …**, and the setting's key is `enableUserPortal` (was `enableCorporatePortal`), with `useUserPortalEnabled` for the hook. The other portal settings keep their `portal…` keys. Earlier entries below were updated to match. Anything which refers to the corporate *theme* (which this was modelled on) is unchanged.
- **A partner who had already switched the portal on under the old key will need to switch it on again**, as nothing reads `enableCorporatePortal` any more.

## 2026-11-18 — Portal as a sidebar, save and exit, richer rows

- **Sidebar:** the portal's dialogs (account, order details, guest email, save and exit) are now a panel on the right of larger screens, so the experience stays in view beside them, and the whole view on phones (compact width). The panel slides in, unless the customer prefers reduced motion.
- **Email prompt on the welcome page:** with **User Portal: Ask for Email** on, leaving the welcome page (with **Start a new order**, or after applying saved branding) asks for the email first. The prompt is still asked on first reaching the personalise page when there's no welcome page, and each bundle is only asked once.
- **Save and exit:** new **User Portal: Save and Exit** setting (on by default) adds a button to the stepper bar once there are designs. It names the draft (blank is fine), asks a guest for the email address which makes them its owner (a signed in customer, or a bundle which has an owner, isn't asked), then leaves: it closes the experience when it's in a frame, and otherwise starts over for the next customer.
- **Richer rows:** orders and drafts show the order or quote number before the name (falling back to the collection's name), when they were created, how many **products** they have (not designs or recipients) and their total, where there's a presentment currency.
- Not done by choice: localization of the portal's text, and a separate landing page. Invalid dispatch dates are left for something more first-class than a theme setting.

## 2026-11-18 — Tests

- `yarn test` runs the first tests (Vitest, with jsdom and Testing Library; config in `vitest.config.ts`, not `vite.config.ts`, so the theme plugin isn't loaded). Covered: the order details helpers (`utils/orderDetails`), the account logic (`hooks/useAccount`: session restore, attaching the bundle, sign-in, sign-out and reset, drafts, duplicating, the default template), the order details form, the inactivity timer, and the configuration schema and page settings (unique keys, every configured field exists, the welcome page's place).
- The inactivity timer moved out of `PageHandler` into `hooks/useInactivityTimeout` so it can be tested. It now uses the latest callback without restarting the wait whenever the page re-renders.

## 2026-11-17 — Welcome page, saved assets, default template, timeout and start over

- **Welcome page:** a new optional page (Welcome, off until switched on) in a group of its own, so it can't be moved: it's always first. Title, description, background image and every button's text are settings. It starts a new order, and with the user portal also offers **saved branding**, **duplicate a previous order** and **continue a draft / sign in**, which open the account dialog on that page (the customer signs in first if they haven't). Applying branding from it carries straight on to the order. A bundle that already has designs (a draft, a duplicate) skips it, and it comes back whenever the bundle is replaced (sign-out, timeout, start over).
- **Saved assets:** new **Saved assets** page in the account menu listing the customer's asset configurations (thumbnail, name, colour channels) with remove, as in the corporate theme. Assets a signed-in customer creates (e.g. uploading in a frame step) will be linked to them automatically, so they'll appear here with nothing more to do.
- **Default template:** a signed-in customer with a default template has it applied to their new bundle (its shared options, and its name in the bundle's `template` metadata). Bundles with designs or branding already are left alone. The corporate theme starts the new bundle as a copy; here the bundle already exists, so its options are set instead.
- **Inactivity timeout:** new **User Portal: Inactivity Timeout (seconds)** setting. After that long without a click, touch, key press or movement, the customer is signed out and the bundle replaced (or, with nothing to clear, the welcome page is shown again).
- **Start over:** the thank you page has a **Start a new order** button (**Show Start Over Button** / **Start Over Button Text** settings). It does whatever of the hand-off is left (adding the design to the e-commerce cart; nothing for test orders and quotes, which are already done) and then starts a new bundle.
- **Collection badges:** saved branding shows the collections it's available in when the activation's collections use different shared options, and is disabled with a reason if it was made for a different configuration than the current bundle's. Applying it now shows "Applied ✓".

## 2026-11-17 — User portal: menu, sign-out and order details

- **Menu:** the account dialog now opens on a menu (Draft orders, Previous orders, Saved branding, Sign out) in place of tabs, with a "← Menu" link back from each page.
- **Sign out** also replaces the bundle with a new empty one (`startNewBundle`, shared with the first load in `App`), so the next person at the screen doesn't see the last customer's design. Their drafts are still saved against their account.
- **Order details:** three new settings, **User Portal: Order Name / Purchase Order / Dispatch Date**, each *Not asked* (the default), *Asked, optional* or *Asked, required*. They're recorded on the bundle's own `name`, `purchaseOrder` and `dispatchDate` fields (not its metadata), and only those which have changed are sent.
  - Whichever are switched on are asked in an **Order details** button on the stepper bar, at any time, and when **duplicating** a previous order (before the copy is made).
  - Required ones must be filled in before a design can be completed or a quote requested; the dialog opens for them if they aren't.
  - The dispatch date is saved as the corporate theme does: the chosen day at the current local time, as an ISO instant, and read back as a local day.
  - The dispatch date can't be in the past, and is kept within the product collection's dispatch dates when it has them.
- New: `utils/orderDetails.ts`, `hooks/useOrderDetails.ts`, `components/OrderDetailsForm.tsx`, `components/OrderDetailsDialog.tsx`.

## 2026-11-17 — User portal: saved branding and guest email

- **Saved branding:** with the portal on and an activation that has shared options (a Global Property Configuration), the account dialog gains a **Saved branding** tab. It lists the signed-in customer's templates for that configuration, and **Apply** puts one on the bundle (recording its name in the bundle's `template` metadata) and shows the shared page afresh. The tab can also save the current shared options as a new template, and remove one.
- **Guest email prompt:** new **User Portal: Ask for Email** setting. When on, a customer who isn't signed in is asked for their email as they first reach the personalise page (once per bundle, never when the bundle already has an owner). The email becomes the bundle's owner. **Continue as guest** closes it. With **User Portal: Enforce Sign-in** the prompt is the sign-in form (email and code) instead.
- New: `components/GuestEmailDialog.tsx`, `components/dialogParts.tsx` (the dialogs' shared styling).

## 2026-11-17 — User portal

- New **Enable User Portal** setting (Personalise > Checkout), modelled on the corporate theme's portal. When it's on it **completely replaces the conversion configuration**: the details dialog, its start/end/manual locations, the "Your details" button, the recipient's conversion configuration id and the details saved to the bundle's metadata are all skipped.
- **Sign-in:** the stepper bar's button opens an account dialog where the customer enters their email and the code sent to it (`generateVerificationCode` / `verifyCode`). A session from a previous visit is restored (and dropped if the customer belongs to another partner). Signing in attaches the current bundle to the customer as its owner, unless it already has one.
- **Re-open drafts:** the **Drafts** tab lists the customer's unordered bundles which have designs in them, and **Continue** loads one in place of the current bundle, picking up at the personalise page.
- **Duplicate orders:** the **Previous orders** tab lists their ordered bundles, and **Duplicate** copies one (designs included) and works on the copy.
- Requesting a quote uses the signed-in customer instead of asking for details, and asks them to sign in first if they haven't.
- New: `hooks/useAccount.tsx`, `components/AccountDialog.tsx`; `BundleProvider` now also takes `setBundle`, so `App` can swap the bundle.

## 2026-11-16 — Moving between designs

- The **shared personalise page** has the experience switcher (when the bundle has more than one design), which only changes the design shown in the 3D preview; the options on the page are shared, so nothing else depends on it.
- On the **personalise page**, when another design follows the current one, a **"Next product"** button (with an arrow) is offered in addition to the usual way on, which is still there (add to cart / quote, "Review your design" or "Continue", as before). In the finish step it sits above that button; with the review page on, the action bar shows both. The same checks as before (updates pending, mandatory steps, validation) run as each design is left. "Next" follows the switcher's order; when building a cart, products added to a design by a product step belong to it and are skipped over.

## 2026-11-16 — Cart on narrow screens

- When the cart sits below the products (stacked layout, i.e. phones and portrait), it now shows only the **design added last**, with the heading's count ("Your cart (3)"), the total and Continue, so it no longer fills the bottom of the screen with a scroll area. With more than one design, an expand icon button covers the whole products area (below the stepper and banners) with the full cart, and the same button collapses it again. Removing designs down to one collapses it. Beside the products the cart is unchanged. (`ProductSelector/Cart.tsx`; the products area is now `position: relative` for the overlay.)

## 2026-11-16 — Conversion configuration on every transaction

- When the theme has a conversion configuration, `PageHandler` assigns its id to the recipient of every transaction in the bundle (including products added by a product step, and designs from a reloaded bundle) through `WorkflowManager.updateRecipient`, leaving the rest of the recipient as it is. Transactions which already have it are skipped, each is only updated once (a failure is retried the next time the cart changes), and the id is still also kept in the bundle's metadata as before.

## 2026-11-16 — Templating fields in text

- Text steps and the shared text property now work with templating fields as the corporate theme does, through one component (`Customization/components/TemplateTextField.tsx`, using core 44.21's `parseTextTemplateForWorkflow`):
  - Under the text box is a row of pill buttons, one per field from `getTemplatingKeys()` (hover for the field and its current value). A button inserts `{{key}}` where the cursor is as if it had been typed, so undo works, or on the end of the text when the box isn't being edited.
  - When the box isn't being edited and the text has fields in it, it's shown as the design will have it: each field becomes a chip with its value, green when it has one and red (showing the field as written) when it would be blank. Clicking or tabbing into it goes back to editing.
  - A field which isn't finished (such as an unclosed `{{`) gives the box an error border and a message. The text's own problems (blocked words, limits) still take precedence.
  - The shared property fills fields in from the first design, as core does, and only offers the buttons when `isTemplatingEnabled()` is true. The earlier debug logging of the keys was removed.

## 2026-11-16 — Shared (global) personalisation

- New optional **Shared Personalise page** (`Pages/SharedPersonalisation`) for the Global Property Configuration: options shared by every product in the design, rendered from `bundle.getGlobalProperties()`. Text, file upload (local and mobile, following the same theme settings as the frame step), option and color option properties are supported. Silent properties are not shown, mandatory ones (marked `*`) block continuing until fulfilled, and properties with conditions appear and disappear as the customer answers (`conditional-global-properties-changed`).
- The page is **off by default** (toggle `shared-personalise` in the theme's page settings) and **is not part of the journey when the bundle has no global properties** (`activation.globalPropertyConfiguration`, which core now fetches as just an id), even if switched on. Its steps-bar label is "Shared".
- The Personalise and Shared Personalise pages are in a new reorderable `personalization` page group, so the partner can put either first (shared comes first by default). The review and thank you pages stay in the `journey` group after them. `Customization` has a new `nextPage` prop (replacing its own check of whether the review page is on) so its buttons say "Continue" when the shared page follows.
- When the shared page is last and there's no review page, it completes the design itself (add to cart, or request a quote).
- **Overriding shared properties for one product**: on the Personalise page, a step which uses shared properties (while the shared page is shown) is replaced by a notice saying it's set on the shared page, with a "Customise for this product" button (`Customization/components/GlobalPropertyOverride.tsx`). It calls `setOverrideGlobalPropertyConfiguration(type, true)` for each kind of shared property the step uses (a text step can use both text and colour) and reveals the step's normal controls. A "Use shared" button in the step's top right turns the overrides off and re-applies the shared values to this product with `applyGlobalState([experience])`. A frame step keeps its position and scale controls (`ImageCropper`) available while the image is shared, as those aren't shared; its image controls (upload, remove, optimise, colours) appear once it's overridden (`FrameUI`'s `imageShared` prop).
- The shared **file upload property** (`SharedPersonalization/FileUploadProperty.tsx`) matches the frame step's image handling where the handle allows it: remove or restore the background and "Optimize image" (vectorise) when the integration has the Advanced Image Manipulation addon, and colour editing with `SVGColorSelector` when the property has its colour picker on (PMS values when its PMS picker is on). Not available, as the handle has no API for them: removing an image, merging colours, and switching back from an optimised image. Optimising restarts from the original image, so it is only offered while the background is not removed. The property has no file type setting, so the default list of types is used.
- The shared **text property** now behaves like a text step: it finds the text steps which use it (not those overriding it) and applies the text to them as it's typed, so it's checked by them. Their verdicts are shown as the step shows them (blocked words, unsupported characters, no new lines, text doesn't fit, character limit; otherwise the fewest characters remaining across them). Unacceptable text isn't kept, so the saved value is always acceptable. It's a multi-line box when any of those steps supports new lines. Templating is covered by the entry below.
- New bundles are created with the activation's id (`getNewBundle(..., activationId)`), which is how the bundle gets that configuration. A product collection's own configuration is ignored by this page's visibility check.

## 2026-11-16 — Adding to the cart no longer blocks the products page

- Adding a product no longer covers the page with a loading overlay. Each click is **queued** (`ProductSelector/index.tsx`) and done one at a time in the order asked for, as each one changes the bundle. The tile which was clicked shows a spinner and "Adding..." (with a count, "Adding (2)...", when the same product has been clicked more than once); its button stays usable so more can be queued. The product appears in the cart as soon as its own add finishes.
- Removals and quantity changes go through the same queue, so they can't interleave with adds. The cart's controls are disabled only while one of those is in progress, and its Continue button waits until nothing is left to add.
- Failures are still reported by the page's error banner. A failed add doesn't stop the ones queued behind it.

## 2026-11-16 — Finishing moves to the review page

- When the review page is on, the Personalise page no longer shows the finish step (order summary, download preview, terms and buttons). Instead its action bar is shown on every layout, not just narrow ones, with the total and a "Review" button ("Continue" when the shared page comes next) which runs the same checks (updates pending, mandatory steps, validation) and shows any problem above it. The total bar at the top is dropped then, as the action bar carries the total.
- The **terms and conditions are on the review page** in that case: one "I agree to the terms and conditions" checkbox (new shared `Customization/components/TermsAgreement.tsx`, also used by the finish step), made from the terms of every workflow in the cart (identical terms are shown once). Adding to the cart and requesting a quote are disabled until it's ticked.
- Without a review page nothing changes: the finish step, with its terms, is shown as before.

## 2026-11-13 — Fix bundles not being created with Activation

- Fixed a small bug where new Bundles were not being provided the active Activation ID.

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
- In single product mode, a `collectionProduct` on the context's bundle options (sent by the e-commerce product page in production) **skips the product page**: the Collection and Product steps are hidden, the design page is shown if the product has several workflows, and a product with one workflow starts straight away. For local development set `VITE_INTEGRATION_PRODUCT_ID` (see `.env.sample`): `index.tsx` resolves it the way the editor does (integration product → product, fetch the activation with that product, find it in the activation's collections, and use that collection) and fails with a clear error if it isn't in the activation. The application key is set before the activation is fetched, as the editor does: the server decides which integration is current from it, and without it `getCurrentIntegration()` throws "not linked to this current integration".
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
- Hand-off with the thank you page: the page _prepares_ the hand-off as it loads (finishes the bundle, and places the order for test orders) and the button performs it (adds to the cart, or closes the window for test orders). Requesting a quote also opens the page; it saves the customer's details and generates the quote number, but doesn't finish the bundle or call `completeQuote` yet, and the button just closes the experience. Without the thank you page everything happens as before, when the previous page continues.
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
