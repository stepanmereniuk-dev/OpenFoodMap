"use client";

import { useEffect, useRef } from "react";

type OffChromeProps = {
  slot: "header" | "footer";
};

const offBaseUrl = "https://world.openfoodfacts.org";
const cssLinks = [
  "/off-css/app-ltr.css?v=1779800845",
  "/off-css/jquery-ui.css",
  "/off-css/select2.min.css",
];

const searchIcon = String.raw`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="icon" aria-hidden="true" focusable="false"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/><path d="M0 0h24v24H0z" fill="none"/></svg>`;
const appIcon = String.raw`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="icon" aria-hidden="true" focusable="false"><path d="M16 1H8C6.34 1 5 2.34 5 4v16c0 1.66 1.34 3 3 3h8c1.66 0 3-1.34 3-3V4c0-1.66-1.34-3-3-3zm-2 20h-4v-1h4v1zm3.25-3H6.75V4h10.5v14z"/><path d="M0 0h24v24H0z" fill="none"/></svg>`;

const headerHtml = String.raw`
<div id="page">
  <div class="upper-nav contain-to-grid" id="upNav">
    <nav class="top-bar" data-topbar role="navigation">
      <section class="top-bar-section">
        <ul class="left">
          <li class="has-dropdown not-click">
            <a id="menu_link" href="#off-header-menu" aria-haspopup="true"><span class="material-icons">menu</span></a>
            <ul class="dropdown" id="off-header-menu">
              <li><a href="/discover">Discover</a></li>
              <li><a href="/contribute">Contribute</a></li>
              <li class="divider"></li>
              <li><label>Add products</label></li>
              <li><a href="/open-food-facts-mobile-app?utm_source=off&utf_medium=web&utm_campaign=pro_platform_install_the_app_to_add_products_en">Install the app to add products</a></li>
              <li><a href="/cgi/product.pl?type=search_or_add&action=display">Add a product</a></li>
              <li class="divider"></li>
              <li><label>Search and analyze products</label></li>
              <li><a href="/cgi/search.pl">Advanced search</a></li>
              <li><a href="/cgi/search.pl?graph=1">Graphs and maps</a></li>
            </ul>
          </li>
          <li>
            <ul class="country_language_selection">
              <li class="has-form has-dropdown not-click" id="select_country_li">
                <select
                  id="select_country"
                  style="width:100%"
                  data-placeholder="Country"
                  data-select2-id="select_country"
                  tabindex="-1"
                  class="select2-hidden-accessible"
                  aria-hidden="true"
                >
                  <option data-select2-id="2"></option>
                  <option value="world" selected data-select2-id="3">world</option>
                </select><span class="select2 select2-container select2-container--default" dir="ltr" data-select2-id="1" style="width: 100%;"><span class="selection"><span class="select2-selection select2-selection--single" role="combobox" aria-haspopup="true" aria-expanded="false" tabindex="0" aria-disabled="false" aria-labelledby="select2-select_country-container"><span class="select2-selection__rendered" id="select2-select_country-container" role="textbox" aria-readonly="true" title="world"><span class="select2-selection__clear" title="Remove all items" data-select2-id="4">×</span>world</span><span class="select2-selection__arrow" role="presentation"><b role="presentation"></b></span></span></span><span class="dropdown-wrapper" aria-hidden="true"></span></span>
              </li>
              <li class="has-dropdown">
                <a href="https://world.openfoodfacts.org/">English</a>
                <ul class="dropdown">
                  <li><a href="https://fr.openfoodfacts.org/">Français</a></li>
                  <li><a href="https://es.openfoodfacts.org/">Español</a></li>
                  <li><a href="https://de.openfoodfacts.org/">Deutsch</a></li>
                  <li><a href="https://it.openfoodfacts.org/">Italiano</a></li>
                </ul>
              </li>
            </ul>
          </li>
        </ul>
        <ul class="right">
          <li class="h-space-tiny has-form">
            <a href="/cgi/session.pl" class="round button secondary">
              <span class="material-icons material-symbols-button">account_circle</span>
              Sign in
            </a>
          </li>
        </ul>
      </section>
    </nav>
  </div>
  <div id="main_container" style="position:relative" class="block_latte">
    <div class="topbarsticky">
      <div class="contain-to-grid" id="offNav">
        <nav class="top-bar" data-topbar role="navigation">
          <ul class="title-area">
            <li class="name">
              <div style="position:relative;max-width:292px;">
                <a href="/">
                  <img id="logo" src="/images/logos/off-logo-horizontal-light.svg" alt="Open Food Facts" style="margin:8px;height:48px;width:auto;">
                </a>
              </div>
            </li>
          </ul>
          <section class="top-bar-section">
            <ul class="left small-4">
              <li class="search-li">
                <form action="/cgi/search.pl">
                  <div class="row"><div class="small-12">
                    <div class="row collapse postfix-round">
                      <div class="columns">
                        <input type="text" placeholder="Search for a product" name="search_terms" value="" style="background-color:white">
                        <input name="search_simple" value="1" type="hidden">
                        <input name="action" value="process" type="hidden">
                      </div>
                      <div class="columns postfix-button-wrapper">
                        <button type="submit" title="Search" class="button postfix" style="line-height:normal">${searchIcon}</button>
                      </div>
                      <div class="columns postfix-button-wrapper">
                        <button type="button" title="Scan a product" class="button barcode-scanner-button" id="barcode-scanner-button">
                          <svg style="width:24px;height:24px" viewBox="0 0 24 24" class="icon" aria-hidden="true" focusable="false"><path d="M2,6H4V18H2V6M5,6H6V18H5V6M7,6H10V18H7V6M11,6H12V18H11V6M14,6H16V18H14V6M17,6H20V18H17V6M21,6H22V18H21V6Z"/></svg>
                        </button>
                      </div>
                    </div>
                  </div></div>
                </form>
              </li>
            </ul>
            <ul class="search_and_links">
              <li><a href="/discover" class="top-bar-links">Discover</a></li>
              <li><a href="/contribute" class="top-bar-links">Contribute</a></li>
              <li class="show-for-xlarge-up"><a href="https://world.pro.openfoodfacts.org/" class="top-bar-links">Producers</a></li>
              <li class="flex-grid getapp"><a href="/open-food-facts-mobile-app?utm_source=off&utf_medium=web&utm_campaign=search_and_links_promo_en" class="buttonbar button" style="top:0;">${appIcon} <span class="bt-text">Get the app</span></a></li>
            </ul>
          </section>
        </nav>
      </div>
    </div>
  </div>
</div>`;

const footerHtml = String.raw`
<footer>
  <div class="block_light bg-white" id="install_the_app_block">
    <div class="row">
      <div class="small-12 flex-grid v-space-short v-align-center direction-row h-space-tiny">
        <div class="cell small-100 medium-100 large-50 flex-grid v-align-center direction-row">
          <img class="cell small-50 v-align-center" src="/images/illustrations/app-icon-in-the-clouds.svg" alt="The Open Food Facts logo in the cloud" style="height:120px">
          <div class="cell small-50 v-align-center" id="footer_scan" style="display:block">
            <div id="footer_install_the_app">Install the app!</div>
            Scan your <span id="everyday">everyday</span> <span id="foods">foods</span>
          </div>
        </div>
        <div class="row">
          <div class="small-12 medium-12 large-12 v-space-normal column badge-container">
            <a href="https://play.google.com/store/apps/details?id=org.openfoodfacts.scanner&utm_source=off&utf_medium=web&utm_campaign=install_the_app_android_footer_en"><img src="/images/misc/playstore/img/latest/GetItOnGooglePlay_Badge_Web_color_English.svg" alt="Get It On Google Play" loading="lazy" height="40" width="120"></a>
            <a href="https://f-droid.org/packages/openfoodfacts.github.scrachx.openfood"><img src="/images/misc/f-droid/svg/get-it-on-en.svg" alt="Available on F-Droid" loading="lazy" height="40" width="120"></a>
            <a href="https://github.com/openfoodfacts/smooth-app/releases/latest?utm_source=off&utf_medium=web&utm_campaign=install_the_app_apk_footer_en"><img src="/images/misc/app-landing-page/download-apk/download-apk_en.svg" alt="Android APK" loading="lazy" height="40" width="120"></a>
            <a href="https://apps.apple.com/app/open-food-facts/id588797948?utm_source=off&utf_medium=web&utm_campaign=install_the_app_ios_footer_en"><img src="/images/misc/appstore/black/appstore_US.svg" alt="Download on the App Store" loading="lazy" height="40" width="120"></a>
          </div>
        </div>
      </div>
    </div>
  </div>
  <section class="donation-banner-footer row">
    <div class="donation-banner-footer__left-aside">
      <div class="donation-banner-footer__hook-section">
        <p>We still need €120,000 to finish 2026!</p>
      </div>
      <img src="/images/misc/donation-banners/donation-banner-group-photo.png" alt="The Open Food Facts community during the Open Food Facts Days" />
    </div>
    <div>
      <div>
        <div class="donation-banner-footer__main-section">
          <img width="50" height="50" src="/images/logos/logo-variants/CMJN-ICON_WHITE_BG_OFF.svg" alt="Open Food Facts logo" />
          <h3 class="donation-banner-footer__main-title">Become an Open Food Facts patron</h3>
        </div>
        <p>Every month, we serve 8 million visitors, and many times that through the API. Your support is essential to:</p>
        <ul>
          <li>keep Open Food Facts open & available to all,<ul><li>support infrastructure, the website, mobile app and API with a small permanent team</li></ul></li>
          <li><p>remain independent of the food industry,</p></li>
          <li><p>support the community</p></li>
          <li><p>support science</p></li>
        </ul>
      </div>
      <div class="donation-banner-footer__actions-section">
        <div class="donation-banner-footer__actions-section__financial">
          <p>If every visitor this month clicked on Donate and gave just 1€, we'd get over 8 times our yearly budget!</p>
        </div>
        <div class="donation-banner-footer__actions-section__donate-button">
          <a href="https://world.openfoodfacts.org/donate-to-open-food-facts?utm_source=off&utm_medium=web&utm_campaign=donate-2026-a&utm_term=en-text-button"><button>Donate</button></a>
        </div>
      </div>
    </div>
  </section>
  <div class="block_light block_cappucino" id="contribute_and_discover_links_block">
    <div class="row">
      <div class="small-12 large-6 columns v-space-normal block_off">
        <h3 class="title-5 text-medium">Join the community</h3>
        <p>Discover our <a href="/code-of-conduct">Code of conduct</a></p>
        <p>Join us on <a href="https://slack.openfoodfacts.org">Slack</a></p>
        <p><a href="https://forum.openfoodfacts.org/">Forum</a></p>
        <p id="footer_social_icons">Follow us:
          <a href="https://x.com/OpenFoodFacts"><img src="/images/icons/dist/x.svg" class="footer_social_icon" alt="x"></a>
          <a href="https://www.facebook.com/OpenFoodFacts?utm_source=off&utf_medium=web"><img src="/images/icons/dist/facebook.svg" class="footer_social_icon" alt="Facebook"></a>
          <a href="https://www.instagram.com/open.food.facts/"><img src="/images/icons/dist/instagram.svg" class="footer_social_icon" alt="Instagram"></a>
        </p>
        <p><a href="https://link.openfoodfacts.org/newsletter-en">Subscribe to our newsletter</a></p>
      </div>
      <div class="small-12 large-6 columns project v-space-normal">
        <h3 class="title-5 text-medium">Discover the project</h3>
        <ul class="inline-list tags_links v-space-tiny h-space-tiny">
          <li><a class="button small white-button radius" href="/who-we-are">Who we are</a></li>
          <li><a class="button small white-button radius" href="/open-food-facts-vision-mission-values-and-programs">Vision, Mission, Values and Programs</a></li>
          <li><a class="button small white-button radius" href="https://support.openfoodfacts.org/help/en-gb">Frequently asked questions</a></li>
          <li><a class="button small white-button radius" href="https://blog.openfoodfacts.org/en/">Open Food Facts blog</a></li>
          <li><a class="button small white-button radius" href="/press">Press</a></li>
          <li><a class="button small white-button radius" href="https://wiki.openfoodfacts.org">Open Food Facts wiki (en)</a></li>
          <li><a class="button small white-button radius" href="/cgi/top_translators.pl">Translators</a></li>
          <li><a class="button small white-button radius" href="/partners">Partners</a></li>
          <li><a class="button small white-button radius" href="https://world.openbeautyfacts.org">Open Beauty Facts - Cosmetics</a></li>
          <li><a class="button small white-button radius" href="https://world.pro.openfoodfacts.org/">Open Food Facts for Producers</a></li>
        </ul>
      </div>
    </div>
  </div>
  <div class="block_off block_dark block_ristreto" id="footer_block">
    <div id="footer_block_image_banner_outside">
      <div id="footer_block_image_banner_outside2">
        <div class="row">
          <div class="small-12 text-center v-space-short h-space-large">
            <a href="/" style="font-size:1rem;"><img id="logo" src="/images/logos/off-logo-horizontal-mono-white.svg" alt="Open Food Facts" style="margin:8px;height:48px;width:auto;"></a>
            <p>A collaborative, free and open database of food products from around the world.</p>
            <ul class="inline-list text-center text-small">
              <li><a href="/legal">Legal</a></li>
              <li><a href="/privacy">Privacy</a></li>
              <li><a href="/terms-of-use">Terms of use</a></li>
              <li><a href="/data">Data, API and SDKs</a></li>
              <li><a href="https://world.openfoodfacts.org/donate-to-open-food-facts">Donate to Open Food Facts</a></li>
              <li><a href="https://world.pro.openfoodfacts.org/">Producers</a></li>
              <li><a href="https://link.openfoodfacts.org/newsletter-en">Subscribe to our newsletter</a></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</footer>`;

function absolutizeOffTargets(root: ShadowRoot) {
  root.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((anchor) => {
    const href = anchor.getAttribute("href");

    if (href?.startsWith("/")) {
      anchor.href = `${offBaseUrl}${href}`;
    }

    if (/^https?:\/\//.test(anchor.href) && new URL(anchor.href).origin !== window.location.origin) {
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
    }
  });

  root.querySelectorAll<HTMLFormElement>("form[action]").forEach((form) => {
    const action = form.getAttribute("action");

    if (action?.startsWith("/")) {
      form.action = `${offBaseUrl}${action}`;
    }
  });
}

function shadowMarkup(slot: OffChromeProps["slot"]) {
  const links = cssLinks.map((href) => `<link rel="stylesheet" href="${href}" data-base-layout="true">`).join("");
  const hostStyles = String.raw`
    <style>
      :host { display: block; font-family: "Public Sans", Helvetica, Roboto, Arial, sans-serif; font-size: 14px; line-height: 1.5; }
      *, *::before, *::after { box-sizing: border-box; }
      #page { display: block !important; height: auto !important; min-height: 0 !important; min-width: 0; }
      #main_container { height: auto !important; min-height: 0 !important; }
      .row { max-width: 1280px !important; }
      @media only screen and (min-width: 641px) {
        #upNav > nav, #offNav > nav { max-width: 1280px !important; margin-left: auto !important; margin-right: auto !important; }
        #upNav, #upNav > nav { height: 45px !important; line-height: 45px !important; }
        #upNav .top-bar-section, #upNav .top-bar-section ul li > a { line-height: 45px !important; }
        #upNav .top-bar-section ul li > a { font-size: 13px; padding: 0 35px 0 15px; }
        #menu_link { padding: 12px 35px 9px 15px !important; }
        #select_country_li { padding-right: 15px !important; width: 155px !important; }
        #upNav .right a { font-size: 14px; padding: 2.8px 15px !important; }
        #main_container, .topbarsticky { height: 82px !important; }
        #offNav { transform: translateY(-6.421875px); }
        #offNav > nav { height: 62px !important; }
        #offNav .search-li { padding-left: 14px !important; padding-right: 14px !important; }
      }
      .topbarsticky { font-size: 0 !important; line-height: 0 !important; position: static !important; }
      .topbarsticky #offNav { font-size: 14px; line-height: 1.5; }
      .has-dropdown:focus-within > .dropdown { display: block !important; left: auto; }
    </style>
  `;

  return `${links}${hostStyles}${slot === "header" ? headerHtml : footerHtml}`;
}

export function OffChrome({ slot }: OffChromeProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;

    if (!host) {
      return;
    }

    const root = host.shadowRoot ?? host.attachShadow({ mode: "open" });
    root.innerHTML = shadowMarkup(slot);
    absolutizeOffTargets(root);
  }, [slot]);

  return <div ref={hostRef} className={`off-chrome-host off-chrome-host-${slot}`} />;
}

export function OffHeader() {
  return <OffChrome slot="header" />;
}

export function OffFooter() {
  return <OffChrome slot="footer" />;
}
