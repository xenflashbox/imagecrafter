import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import { fetchVaultSecrets } from './_infisical.mjs';

const secrets = await fetchVaultSecrets();
const prisma = new PrismaClient({ datasources: { db: { url: secrets.DATABASE_URL } } });
const stripe = new Stripe(secrets.STRIPE_SECRET_KEY);
try {
  const columns = await prisma.$queryRaw`SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'imagecrafter' AND table_name IN ('ic_Order', 'ic_Portrait')`;
  for (const [table, names] of Object.entries({ ic_Order: ['id', 'status', 'stripeSessionId', 'stripePaymentIntentId', 'amount', 'currency', 'updatedAt', 'type'], ic_Portrait: ['status'] })) {
    for (const name of names) if (!columns.some(c => c.table_name === table && c.column_name === name)) throw new Error(`Schema mismatch: ${table}.${name}`);
  }
  const orders = await prisma.order.findMany({ where: { status: 'failed', type: 'digital', stripeSessionId: { not: null }, portrait: { status: 'purchased' } }, select: {
    id: true, status: true, stripeSessionId: true, stripePaymentIntentId: true, amount: true, currency: true, updatedAt: true,
  } });
  for (const order of orders) {
    const checkout = await stripe.checkout.sessions.retrieve(order.stripeSessionId, { expand: ['payment_intent.latest_charge'] });
    const intent = checkout.payment_intent;
    const charge = typeof intent === 'object' && intent?.latest_charge;
    const verified = checkout.metadata?.orderId === order.id && checkout.status === 'complete' && checkout.payment_status === 'paid'
      && intent && typeof intent === 'object' && intent.status === 'succeeded' && intent.id === order.stripePaymentIntentId
      && charge && typeof charge === 'object' && charge.paid && !charge.refunded && charge.amount_refunded === 0
      && checkout.currency === order.currency && checkout.amount_subtotal === order.amount;
    console.log({ order: order.id, stripeVerified: Boolean(verified), apply: process.argv.includes('--apply') });
    if (!verified) throw new Error(`Order ${order.id} requires manual reconciliation; no write`);
    if (process.argv.includes('--apply')) {
      const result = await prisma.order.updateMany({ where: { id: order.id, status: 'failed', stripeSessionId: order.stripeSessionId, updatedAt: order.updatedAt }, data: { status: 'paid' } });
      if (result.count !== 1) throw new Error(`Order ${order.id} changed concurrently`);
      console.log('Restored paid status only; no email, charge, download reset, or tracking replay');
    }
  }
  console.log('Candidates checked:', orders.length);
} finally { await prisma.$disconnect(); }
