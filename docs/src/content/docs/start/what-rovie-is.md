---
title: What Rovie Route is
description: A gateway between your code and every frontier model, with the billing rebuilt around how Africa actually pays.
sidebar:
  order: 1
---

Rovie Route sits between your code and the model providers. You hold one account and
one API key; behind it are OpenAI, Anthropic, Google, Meta, DeepSeek, Mistral
and the rest, reachable through a single OpenAI-compatible endpoint.

Two problems are being solved, and only one of them is technical.

## One key instead of nine

Without a gateway, adding a second model provider means a second account, a
second key, a second SDK, a second billing relationship and a second set of
rate limits to reason about. Switching models means a code change; comparing
them means doing all of the above twice.

Through Rovie Route, changing model is changing a string:

```diff
- model="openai/gpt-4o"
+ model="anthropic/claude-sonnet-5"
```

Same request shape, same response shape, same key, same balance, same usage
dashboard.

## Paying without a dollar card

This is the part that isn't a convenience.

Every frontier lab prices in USD and bills a card. For a developer in Lagos,
Kampala, Accra or Nairobi that is not a minor friction — it is often a hard
stop. Naira cards get declined. Dollar cards have limits measured in tens of
dollars a month. A team that can write the code cannot buy the tokens.

Rovie Route holds the dollar relationship so you don't have to:

- **Top up in your own currency** by bank transfer or stablecoin.
- **Get quoted in your own currency** — every model's per-million price on the
  [models page](https://rovie.africa/models) is converted from USD at a live
  rate, not a stale one.
- **Spend against a balance**, not a card. No subscription, no minimum, no
  monthly commitment. When the balance hits zero the calls stop; nothing
  overdrafts and nothing auto-charges.

See [Balance and top-ups](/guides/billing/) for the mechanics and
[Pricing in local currency](/guides/local-pricing/) for how the conversion
actually works.

## What Rovie Route does not do

Worth being direct about, because gateways vary and the differences matter:

- **It does not train on your traffic.** Prompts and completions pass through
  and are not retained as training data by Rovie. What each upstream provider
  does with them is the provider's own policy, and that is the meaningful
  question — see the [data policy](https://rovie.africa/data-policy).
- **It does not silently reroute.** A request for Claude that came back
  answered by GPT would be a worse outcome than a failed request. If the
  upstream provider is down, you get a 503 and you choose what to do.
- **It does not host models.** Rovie Route proxies to the providers' own APIs. The
  model you call is the provider's real model, at the provider's real quality.
- **It is not a fine-tuning platform.** Inference only, today.

## The shape of the thing

```
your code
    │
    │  Authorization: Bearer rv_...
    ▼
api.rovie.africa  ──────────────┐
    │                           │
    │  meter tokens             │  balance, in USD, funded
    │  draw down balance        │  by a local-currency top-up
    │                           │
    ▼                           ▼
OpenAI / Anthropic /       your dashboard
Google / Meta / …          (usage, keys, payments)
```

One origin serves all of it: the gateway, the public catalog, and the
dashboard's own API. The [reference](/api/) covers the two of those you can
call with a key.

## Next

- [Quickstart](/start/quickstart/) — key to first response.
- [Coming from OpenAI](/start/from-openai/) — if you already have working code.
