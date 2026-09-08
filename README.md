# Kanye Series

Kanye Series is a lightweight, mobile-first Progressive Web App (PWA) storefront for browsing and requesting premium shoes, electronics, secondary science books, and special-order items. The project is built with static HTML/CSS and a small amount of JavaScript to provide a polished, offline-capable demo storefront and PWA experience.

## Features

- Responsive, mobile-first UI using Tailwind CSS and utility-first design
- Progressive Web App support: manifest, service worker, install prompt, offline fallback
- Interactive UI elements using Swiper (carousel), AOS (scroll animations), and SweetAlert2
- Product listing pages with categories (shoes, electronics, books) and special orders
- Admin-styled pages included for demonstration (admin-*.html)
- Lightweight client-side scripts in `js/pwa.js` that manage install UX, network status, splash screen, and service worker lifecycle

## Stack

- Language: HTML (primary), JavaScript (client-side, small)
- Libraries / integrations: Tailwind CSS (via CDN), Bootstrap Icons, Swiper, AOS, SweetAlert2
- PWA: manifest.json, service-worker.js, client PWA bootstrap in `js/pwa.js`

## Repository structure

```
index.html              # Home / storefront landing page (PWA-enabled)
products.html           # Product listing
product.html            # Product detail
cart.html               # Cart UI
checkout.html           # Checkout UI (static)
orders.html             # Orders page
profile.html            # User profile page
login.html              # Login page
signup.html             # Signup page
forgot-password.html    # Password recovery (static)
special-orders.html     # Special order request page
wishlist.html           # Wishlist UI

admin-*.html            # Admin demo pages (admin dashboard, products, orders, users...)

js/
  pwa.js                # Client PWA script: install prompt, splash, network status, SW registration
  p                     # small placeholder file (empty)

images/                 # Brand logos and assets
screenshots/            # App screenshots referenced by manifest
manifest.json           # Web app manifest (PWA metadata)
service-worker.js       # Service worker (offline support)

README.md               # (this file)
```

## How to run locally

This is a static site. To serve it locally you only need a static HTTP server. The PWA service worker requires serving over HTTPS or localhost.

Using Python (3.x):

```
# from the repository root
python -m http.server 8000
# then open http://localhost:8000
```

Using Node (http-server):

```
npm install -g http-server
http-server -c-1 . -p 8000
# then open http://localhost:8000
```

Notes:
- For the install prompt and service worker to work reliably, test on localhost or a secure (HTTPS) host.
- The site is static: product data and ordering flows are demo-only. To make this a working store you'll need to connect the frontend to a backend/API and implement authentication, cart persistence, and payment processing.

## Development notes

- UI is built with Tailwind via CDN; you can migrate to a build step (Tailwind CLI / PostCSS) if you want to customize utilities or purge unused styles.
- The PWA script is in `js/pwa.js` and reads `manifest.json` for splash metadata. Service worker registration is handled there.
- Images and screenshots are stored in `images/` and `screenshots/` respectively.

## To do / suggestions

- Add a real product API and replace client-side placeholders with real requests
- Add tests and CI (linting for HTML/CSS/JS)
- Add a CONTRIBUTING.md with branching / PR guidelines
- Add a LICENSE (MIT recommended) if you want this project to be open-source

## Contributing

Contributions are welcome. Open an issue to discuss changes or send a pull request. For local dev, run a static server and update HTML/CSS/JS, then submit a PR.

## License

Add a license file (e.g., MIT) if you intend to publish this project. Currently none is included in the repository.

## Contact

Project owner: kanyeseries (GitHub)
