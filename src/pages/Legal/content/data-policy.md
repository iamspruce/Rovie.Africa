## The short version

Rovie is a gateway. When you call a model, your prompt leaves us and goes to
the provider that runs that model. What happens to it there is governed by that
provider's terms, not ours.

This page explains what passes through, what we keep, and what we do not.

## What a request carries

A call to the gateway carries the messages you send, the model you named, and
the parameters you set. To fulfil it we must pass the message contents to the
upstream provider — there is no way to route a request without doing so.

Alongside that, we record the metadata a bill is made of: which model, how many
input and output tokens, what it cost, and when. That metadata is what draws
down your balance and what the [rankings](/rankings) aggregate.

## What we keep of the content

> **[To confirm]** — whether prompt and completion **content** is retained at
> all, and if so for how long and for what purpose (abuse investigation,
> debugging, nothing). This is the single most important sentence on this page
> and it must state what the gateway actually does, not what we would like it
> to do.

Until that is confirmed here, assume content may be logged by the gateway in
the ordinary course of operating it.

## What we never do with it

- We do not train models on your prompts or completions. Rovie does not train
  models.
- We do not sell prompt or completion content.
- We do not read your content to build a profile of you or your product.

## Providers

Each model in the [catalog](/models) is run by the company that built it. When
you call that model, that company receives the request. Their retention and
training practices are theirs, and they differ — some train on API traffic by
default, some do not, some let you opt out.

> **[To confirm]** — whether Rovie negotiates no-training terms with providers
> on your behalf, or passes traffic under each provider's default API terms. If
> the latter, this page should link to each provider's policy so the choice of
> model is an informed one.

If a specific model's handling matters to your use case, ask us before you
build on it: [hello@rovie.africa](mailto:hello@rovie.africa).

## Aggregated usage

The rankings page reports measured traffic across everyone using the API:
tokens by model, request counts, latency. It is aggregated and never identifies
an account, a key or a prompt.

## Payments

Top-up data goes to IvoryPay. Card numbers and bank credentials never reach
Rovie's servers — we receive a reference, an amount and a currency, and credit
your balance when the payment is confirmed.

## Deleting your data

Ask us at [hello@rovie.africa](mailto:hello@rovie.africa) and we will delete
what we are not required to keep. Records tied to completed payments generally
must be retained.

## Related

- [Privacy](/privacy) — what we collect about *you*, as opposed to what passes
  through the gateway.
- [Terms of service](/terms) — the agreement governing your use of Rovie.
