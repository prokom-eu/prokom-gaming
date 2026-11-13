import { routes } from './nav'

/**
 * Structured-data pieces shared by the SEO helpers (`lib/seo.ts`) and the build page
 * (`lib/buildPage.ts`, browser-safe) — kept apart so the build page does not pull in the shell
 * data of `lib/site.ts`.
 */

/** `@id` of the brand in `organizationJsonLd` — other pages point to it instead of repeating it. */
export const organizationId = (siteUrl: string): string =>
  `${new URL(routes.home, siteUrl).toString()}#organizacja`

/**
 * Delivery and return terms of every offer (spec. §1), for Google's merchant listings:
 * insured courier included in the price, anywhere in Poland; assembly 5–10 working days after
 * payment, courier 24 h from dispatch (Krystian 14.11.2026); 14-day return by post at the customer's cost (stated neutrally, as on the site).
 */
export const OFFER_TERMS = {
  itemCondition: 'https://schema.org/NewCondition',
  shippingDetails: {
    '@type': 'OfferShippingDetails',
    shippingRate: { '@type': 'MonetaryAmount', value: 0, currency: 'PLN' },
    shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'PL' },
    deliveryTime: {
      '@type': 'ShippingDeliveryTime',
      handlingTime: { '@type': 'QuantitativeValue', minValue: 5, maxValue: 10, unitCode: 'DAY' },
      // 24 h from handing the parcel to the courier (Krystian 14.11.2026).
      transitTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 1, unitCode: 'DAY' },
    },
  },
  hasMerchantReturnPolicy: {
    '@type': 'MerchantReturnPolicy',
    applicableCountry: 'PL',
    returnPolicyCountry: 'PL',
    returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
    merchantReturnDays: 14,
    returnMethod: 'https://schema.org/ReturnByMail',
    // The customer sends it back at their own cost — no fee charged by us.
    returnFees: 'https://schema.org/ReturnFeesCustomerResponsibility',
  },
} as const
