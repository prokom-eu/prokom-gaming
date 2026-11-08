import type { CollectionBeforeDeleteHook, CollectionConfig } from 'payload'

import { adminOnly, nobody } from '../access/panel'
import { GROUP_OFFER } from './shared'

// Its offer readings go with it (the relation is required).
const deleteObservations: CollectionBeforeDeleteHook = async ({ id, req }) => {
  await req.payload.delete({
    collection: 'price-observations',
    where: { check: { equals: id } },
    overrideAccess: true,
    req,
  })
}

/**
 * One run of the price check (panel spec §11, §17; ADR-G007): who started it, progress, what
 * Claude read and searched, tokens and cost (the monthly limit sums `costUsd`), the summary and
 * the `diff` computed by lib/pricing (changes, impact on builds, reviews). Written by the job only.
 */
export const PriceChecks: CollectionConfig = {
  slug: 'price-checks',
  labels: { singular: 'Sprawdzenie cen', plural: 'Sprawdzenia cen' },
  admin: {
    group: GROUP_OFFER,
    useAsTitle: 'startedAt',
    defaultColumns: ['startedAt', 'trigger', 'status', 'itemsFound', 'costUsd'],
  },
  defaultSort: '-startedAt',
  // Read: panel admins; writes come from the job and the panel actions (Local API).
  access: { read: adminOnly, create: nobody, update: nobody, delete: adminOnly },
  hooks: { beforeDelete: [deleteObservations] },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'trigger',
          label: 'Uruchomienie',
          type: 'select',
          required: true,
          options: [
            { label: 'ręcznie', value: 'manual' },
            { label: 'z harmonogramu', value: 'schedule' },
          ],
        },
        {
          name: 'status',
          label: 'Stan',
          type: 'select',
          required: true,
          defaultValue: 'running',
          index: true,
          options: [
            { label: 'w toku', value: 'running' },
            { label: 'zakończone', value: 'done' },
            { label: 'błąd', value: 'failed' },
            { label: 'limit wydatków', value: 'budget' },
          ],
        },
        { name: 'startedAt', label: 'Start', type: 'date', required: true, index: true },
        { name: 'finishedAt', label: 'Koniec', type: 'date' },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'progress',
          label: 'Postęp (%)',
          type: 'number',
          min: 0,
          max: 100,
          defaultValue: 0,
        },
        { name: 'step', label: 'Krok', type: 'text' },
        { name: 'itemsTotal', label: 'Pozycje', type: 'number', defaultValue: 0 },
        { name: 'itemsFound', label: 'Znalezione', type: 'number', defaultValue: 0 },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'pagesRead', label: 'Strony', type: 'number', defaultValue: 0 },
        { name: 'searches', label: 'Wyszukiwania', type: 'number', defaultValue: 0 },
        { name: 'inputTokens', label: 'Tokeny wejścia', type: 'number', defaultValue: 0 },
        { name: 'outputTokens', label: 'Tokeny wyjścia', type: 'number', defaultValue: 0 },
        { name: 'costUsd', label: 'Koszt (USD)', type: 'number', defaultValue: 0 },
      ],
    },
    { name: 'summary', label: 'Podsumowanie Claude', type: 'textarea' },
    { name: 'diff', label: 'Wynik przeliczenia (JSON)', type: 'json' },
    { name: 'error', label: 'Błąd', type: 'text' },
    {
      type: 'row',
      fields: [
        { name: 'readAt', label: 'Przeczytany', type: 'date' },
        { name: 'acceptedAt', label: 'Propozycje przyjęte', type: 'date' },
      ],
    },
  ],
}
