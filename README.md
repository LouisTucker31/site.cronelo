# Cronelo website

The marketing site for Cronelo. It explains the app and links to it; the app itself lives
at https://app.cronelo.co.uk and is a separate project. This site is https://cronelo.co.uk,
hosted on Cloudflare Pages from the `main` branch.

Plain HTML, CSS and JavaScript with no build step and no third-party files: fonts, images and
video are all served from this folder.

- `index.html`: the home page
- `pages/`: the privacy and terms pages
- `css/styles.css`: all the styles, with colour tokens and the light and dark themes at the top
- `js/common.js`: on every page, loaded in `<head>`: theme, header height, tooltips, framing check
- `js/main.js`: the home page only: the live timeline, view tabs and demo video
- `assets/`: screenshots and demo videos (a light and a dark version of each), fonts, favicon
- `_headers`: HTTP security headers for hosts that support them

To run it locally, serve the folder over HTTP (for example `npx serve .`) and open it in a
browser. Opening `index.html` straight from disk mostly works, but browsers treat local files
differently, so check over HTTP before trusting a result.

## Security

Every page has a Content Security Policy in a `<meta>` tag that only lets the site's own files
load, plus a referrer policy. There's no `unsafe-inline`, so:

- Don't add `style="..."` attributes in HTML or in strings the scripts build; the policy
  blocks them. Use a class, or set `element.style` from JavaScript, which is allowed.
- Don't add inline `<script>` blocks or `onclick=` attributes; put code in `js/`.
- Adding anything from another site (a script, font, embed or analytics) means updating the
  policy on every page and in `_headers`, and giving any CDN file an `integrity` hash.

The scripts build page content with `textContent` and `createElement`, never by putting text
into `innerHTML`. The only `innerHTML` left is a fixed SVG icon written in `js/main.js`.

### Headers and hosting

A `<meta>` tag can't set everything. These need real HTTP headers, which are all in
`_headers`:

- `Strict-Transport-Security` (HTTPS only, remembered for a year)
- `X-Content-Type-Options`, `Permissions-Policy` and `X-Frame-Options`
- `frame-ancestors 'none'` in the policy, which stops other sites showing this one in a frame

Cloudflare Pages and Netlify apply `_headers` automatically (no build command, output
directory `/`). GitHub Pages can't send custom headers at all. If the site is hosted there,
those headers are missing, and only the fallback in `js/common.js` stops framing: it hides
the page when it's inside another site's frame.

### Turning on the policy

In `_headers` the policy starts as `Content-Security-Policy-Report-Only`, so a mistake can't
break the live site. After the first deploy:

1. Open every page with the browser's console showing, and play the demo video. Look for
   messages saying the policy would have blocked something.
2. Fix anything it reports, in the code or the policy.
3. Rename the header to `Content-Security-Policy` and deploy again.

The `<meta>` policy in each page already enforces everything except `frame-ancestors`, and
has been tested on every page.

After any hosting change, check the live headers with https://securityheaders.com or the
Mozilla HTTP Observatory.

## Before launch

- Have the privacy and terms pages checked.
- Add an `og:image` (a 1200×630 PNG or JPG) so shared links show a picture.

## Search

`index.html` carries structured data (Organization, SoftwareApplication and FAQPage) in a
`<script type="application/ld+json">` block in `<head>`. The FAQ part must match the questions
and answers on the page word for word, so update both together, then check the page with
Google's Rich Results Test. The JSON block isn't run as a script, so the security policy allows it.

The hero timeline's height is reserved in `css/styles.css` for its eight rows, so the page
doesn't shift as the script draws it. Change that number if the example tasks change.

## Fonts

Inter and JetBrains Mono, both under the SIL Open Font License, copied from the app so the
two match.

## Icons

Lucide (lucide.dev, ISC License, Copyright (c) Lucide Contributors), the same set as the app
(shapes from lucide-static 1.68.0). Each is pasted into the page as an inline SVG, so nothing
loads from another site. To add one, copy its shapes from the icon's SVG at lucide.dev rather
than drawing a new one.

## Link previews

`assets/og-image.png` (1200×630) is the picture shown when the site is shared on social media,
chat apps and in ads. It's the home page headline beside the timeline screenshot; remake it when
either changes, and keep the `og:image` tags in `index.html` pointing at it.
