-- Drop legacy ProducerSubscription model (replaced by Subscription + Plan + Invoice)
DROP TABLE IF EXISTS "ProducerSubscription";
DROP TYPE IF EXISTS "ProducerSubscriptionStatus";
