import type {
  CurriculumModule,
  Difficulty,
  InterviewQuestion,
  QuestionFormat,
  Topic
} from "@interview-architect/domain";

import {
  assertValidCurriculum,
  CATALOG_SCHEMA_VERSION,
  type CurriculumCatalog
} from "./schema.js";

/** A deterministic editorial timestamp makes catalog builds reproducible. */
const REVIEWED_AT = "2026-08-09T00:00:00.000Z";

export const modules: CurriculumModule[] = [
  {
    id: "foundations",
    slug: "system-design-foundations",
    title: "System Design Foundations & Networking",
    description: "Turn ambiguous product requests into measurable, dependable system boundaries.",
    accent: "#6366F1",
    order: 1,
    topicIds: ["requirements-capacity", "networking-protocols"]
  },
  {
    id: "api-auth",
    slug: "apis-gateways-authentication",
    title: "APIs, Gateways & Authentication",
    description: "Design stable service contracts, safe writes, and clear trust boundaries.",
    accent: "#0EA5E9",
    order: 2,
    topicIds: ["api-design", "identity-gateways"]
  },
  {
    id: "data-modeling",
    slug: "databases-data-modeling",
    title: "Databases & Data Modeling",
    description: "Choose storage, indexes, and migrations from access patterns and correctness needs.",
    accent: "#8B5CF6",
    order: 3,
    topicIds: ["data-modeling-basics", "query-storage"]
  },
  {
    id: "redis",
    slug: "caching-and-redis",
    title: "Caching & Redis",
    description: "Use Redis deliberately for low-latency reads, coordination, and streaming workloads.",
    accent: "#EF4444",
    order: 4,
    topicIds: ["redis-data-models", "redis-reliability", "redis-streams-patterns"]
  },
  {
    id: "kafka",
    slug: "queues-streams-kafka",
    title: "Queues, Streams & Kafka",
    description: "Build durable, observable event flows with explicit delivery and ordering semantics.",
    accent: "#F59E0B",
    order: 5,
    topicIds: ["kafka-core", "kafka-delivery-schema", "kafka-operations"]
  },
  {
    id: "reliability",
    slug: "reliability-observability-incidents",
    title: "Reliability, Observability & Incidents",
    description: "Operate systems through meaningful objectives, feedback loops, and calm incident response.",
    accent: "#10B981",
    order: 6,
    topicIds: ["observability", "resilience-incidents"]
  },
  {
    id: "distributed-systems",
    slug: "distributed-systems-scalability",
    title: "Distributed Systems & Scalability",
    description: "Reason about consistency, partitions, coordination, and growth without hand-waving.",
    accent: "#14B8A6",
    order: 7,
    topicIds: ["consistency-coordination", "partitioning-scalability"]
  },
  {
    id: "security-case-studies",
    slug: "security-privacy-case-studies",
    title: "Security, Privacy & Final Case Studies",
    description: "Make security and privacy properties first-class requirements in system design.",
    accent: "#EC4899",
    order: 8,
    topicIds: ["application-security", "threat-modeling-case-studies"]
  }
];

export const topics: Topic[] = [
  {
    id: "requirements-capacity",
    moduleId: "foundations",
    slug: "requirements-and-capacity",
    title: "Requirements & Capacity",
    description: "Translate product language into traffic, storage, latency, and correctness targets.",
    learningObjectives: [
      "Separate functional requirements from quality attributes.",
      "Estimate traffic and storage with stated assumptions.",
      "Identify the first bottleneck worth designing for."
    ],
    prerequisiteTopicIds: [],
    order: 1
  },
  {
    id: "networking-protocols",
    moduleId: "foundations",
    slug: "networking-and-protocols",
    title: "Networking & Protocols",
    description: "Reason about request paths, latency budgets, and protocol-level behavior.",
    learningObjectives: [
      "Trace a request across client, edge, service, and datastore boundaries.",
      "Choose protocols from latency, compatibility, and operational requirements.",
      "Explain timeout and backpressure interactions."
    ],
    prerequisiteTopicIds: ["requirements-capacity"],
    order: 2
  },
  {
    id: "api-design",
    moduleId: "api-auth",
    slug: "api-design",
    title: "API Design",
    description: "Create evolvable interfaces with stable semantics for reads and writes.",
    learningObjectives: [
      "Model resources, errors, pagination, and versioning deliberately.",
      "Make externally retried writes safe through idempotency.",
      "State compatibility guarantees for API clients."
    ],
    prerequisiteTopicIds: ["networking-protocols"],
    order: 1
  },
  {
    id: "identity-gateways",
    moduleId: "api-auth",
    slug: "identity-and-gateways",
    title: "Identity & Gateways",
    description: "Establish authentication, authorization, and traffic-control boundaries.",
    learningObjectives: [
      "Distinguish authentication from authorization.",
      "Place gateway controls at an appropriate trust boundary.",
      "Explain service-to-service identity choices."
    ],
    prerequisiteTopicIds: ["api-design"],
    order: 2
  },
  {
    id: "data-modeling-basics",
    moduleId: "data-modeling",
    slug: "data-modeling-basics",
    title: "Data Modeling",
    description: "Model entities and invariants around the operations the system must support.",
    learningObjectives: [
      "Choose relational or document structures from query and transaction needs.",
      "Write down ownership and consistency invariants.",
      "Recognize data duplication that is an intentional projection."
    ],
    prerequisiteTopicIds: ["requirements-capacity"],
    order: 1
  },
  {
    id: "query-storage",
    moduleId: "data-modeling",
    slug: "query-and-storage",
    title: "Query & Storage",
    description: "Use indexes, query plans, and online changes to keep data access predictable.",
    learningObjectives: [
      "Design indexes from query predicates and sort order.",
      "Interpret a query plan before adding infrastructure.",
      "Plan backward-compatible data migrations."
    ],
    prerequisiteTopicIds: ["data-modeling-basics"],
    order: 2
  },
  {
    id: "redis-data-models",
    moduleId: "redis",
    slug: "redis-data-models",
    title: "Redis Data Models & Caching",
    description: "Select Redis structures and invalidation strategies for concrete access patterns.",
    learningObjectives: [
      "Match strings, hashes, sorted sets, and bitmaps to workloads.",
      "Prevent cache stampedes and stale-data surprises.",
      "Treat memory and expiration as product constraints."
    ],
    prerequisiteTopicIds: ["data-modeling-basics"],
    order: 1
  },
  {
    id: "redis-reliability",
    moduleId: "redis",
    slug: "redis-reliability",
    title: "Redis Reliability & Operations",
    description: "Operate Redis under replication, persistence, cluster, and latency pressure.",
    learningObjectives: [
      "Explain the durability gap between memory and disk persistence.",
      "Choose replication, failover, and cluster topology intentionally.",
      "Investigate memory and latency regressions safely."
    ],
    prerequisiteTopicIds: ["redis-data-models"],
    order: 2
  },
  {
    id: "redis-streams-patterns",
    moduleId: "redis",
    slug: "redis-streams-and-patterns",
    title: "Redis Streams & Coordination Patterns",
    description: "Use Streams and coordination primitives with explicit delivery assumptions.",
    learningObjectives: [
      "Differentiate Pub/Sub from persistent stream consumption.",
      "Recover pending consumer-group work without accidental duplicates.",
      "Evaluate locks and rate limits for failure safety."
    ],
    prerequisiteTopicIds: ["redis-data-models", "redis-reliability"],
    order: 3
  },
  {
    id: "kafka-core",
    moduleId: "kafka",
    slug: "kafka-core",
    title: "Kafka Core Concepts",
    description: "Model topics, partitions, replication, and consumer groups from first principles.",
    learningObjectives: [
      "Explain partition ordering and consumer parallelism.",
      "Choose keys and replication factors from business constraints.",
      "Estimate throughput and retention capacity."
    ],
    prerequisiteTopicIds: ["requirements-capacity"],
    order: 1
  },
  {
    id: "kafka-delivery-schema",
    moduleId: "kafka",
    slug: "kafka-delivery-and-schema",
    title: "Kafka Delivery & Schema",
    description: "Build consumers that tolerate retries, evolution, and replay.",
    learningObjectives: [
      "Differentiate at-most-once, at-least-once, and effectively-once designs.",
      "Use idempotency and transactions at the correct boundary.",
      "Evolve events without silently breaking consumers."
    ],
    prerequisiteTopicIds: ["kafka-core", "api-design"],
    order: 2
  },
  {
    id: "kafka-operations",
    moduleId: "kafka",
    slug: "kafka-operations",
    title: "Kafka Operations & Streaming Patterns",
    description: "Run healthy clusters and recover event flows with evidence instead of guesswork.",
    learningObjectives: [
      "Diagnose lag, partition skew, and rebalance churn.",
      "Size brokers while preserving replication headroom.",
      "Design retries, dead-letter handling, and regional recovery."
    ],
    prerequisiteTopicIds: ["kafka-core", "kafka-delivery-schema"],
    order: 3
  },
  {
    id: "observability",
    moduleId: "reliability",
    slug: "observability",
    title: "Observability & Service Objectives",
    description: "Measure user-visible reliability and make investigations efficient.",
    learningObjectives: [
      "Define SLIs, SLOs, and error budgets from user journeys.",
      "Connect metrics, logs, and traces to a diagnostic hypothesis.",
      "Avoid alerting on symptoms that lack an actionable owner."
    ],
    prerequisiteTopicIds: ["requirements-capacity"],
    order: 1
  },
  {
    id: "resilience-incidents",
    moduleId: "reliability",
    slug: "resilience-and-incidents",
    title: "Resilience & Incidents",
    description: "Design graceful degradation and learn constructively from production incidents.",
    learningObjectives: [
      "Apply timeouts, retries, circuit breakers, and load shedding coherently.",
      "Lead an incident with scope, communication, and mitigation discipline.",
      "Turn failures into prioritized reliability work."
    ],
    prerequisiteTopicIds: ["observability"],
    order: 2
  },
  {
    id: "consistency-coordination",
    moduleId: "distributed-systems",
    slug: "consistency-and-coordination",
    title: "Consistency & Coordination",
    description: "Choose consistency and coordination mechanisms based on observable user outcomes.",
    learningObjectives: [
      "State what a client is guaranteed to observe after a write.",
      "Recognize when a distributed transaction is unnecessary or harmful.",
      "Model compensation and convergence for partial failures."
    ],
    prerequisiteTopicIds: ["data-modeling-basics"],
    order: 1
  },
  {
    id: "partitioning-scalability",
    moduleId: "distributed-systems",
    slug: "partitioning-and-scalability",
    title: "Partitioning & Scalability",
    description: "Scale storage and compute while preserving routing, rebalancing, and hotspot behavior.",
    learningObjectives: [
      "Select a partition key and test it against skew.",
      "Describe how data moves during a reshard.",
      "Separate load distribution from correctness guarantees."
    ],
    prerequisiteTopicIds: ["consistency-coordination"],
    order: 2
  },
  {
    id: "application-security",
    moduleId: "security-case-studies",
    slug: "application-security",
    title: "Application Security & Privacy",
    description: "Build secure defaults for identity, secrets, sensitive data, and tenant boundaries.",
    learningObjectives: [
      "Identify trust boundaries and authorization checks.",
      "Protect secrets and personal data through their lifecycle.",
      "Design auditability without leaking sensitive values."
    ],
    prerequisiteTopicIds: ["identity-gateways"],
    order: 1
  },
  {
    id: "threat-modeling-case-studies",
    moduleId: "security-case-studies",
    slug: "threat-modeling-and-case-studies",
    title: "Threat Modeling & Case Studies",
    description: "Practice complete designs by surfacing abuse paths and prioritizing mitigations.",
    learningObjectives: [
      "Run a lightweight threat model across data flows and assets.",
      "Prioritize mitigations by likelihood, impact, and cost.",
      "Defend trade-offs in a final system-design interview."
    ],
    prerequisiteTopicIds: ["application-security", "consistency-coordination"],
    order: 2
  }
];

type Reference = InterviewQuestion["references"][number];

const references = {
  foundations: [
    { label: "RFC 9110: HTTP Semantics", href: "https://www.rfc-editor.org/rfc/rfc9110" }
  ],
  api: [
    { label: "RFC 9110: HTTP Semantics", href: "https://www.rfc-editor.org/rfc/rfc9110" }
  ],
  database: [
    { label: "PostgreSQL documentation", href: "https://www.postgresql.org/docs/current/" }
  ],
  redis: [
    { label: "Redis documentation", href: "https://redis.io/docs/latest/" }
  ],
  kafka: [
    { label: "Apache Kafka documentation", href: "https://kafka.apache.org/documentation/" }
  ],
  reliability: [
    { label: "Google SRE Book", href: "https://sre.google/sre-book/table-of-contents/" }
  ],
  distributed: [
    { label: "RFC 9110: HTTP Semantics", href: "https://www.rfc-editor.org/rfc/rfc9110" }
  ],
  security: [
    { label: "OWASP Top 10", href: "https://owasp.org/www-project-top-ten/" }
  ]
} satisfies Record<string, Reference[]>;

type QuestionBlueprint = {
  slug: string;
  primaryTopicId: string;
  title: string;
  type: QuestionFormat;
  difficulty: Difficulty;
  estimatedMinutes: number;
  tags: string[];
  question: string;
  scenario?: string;
  requirements?: string[];
  constraints?: string[];
  followUps: string[];
  hints: string[];
  summary: string;
  answerPoints: string[];
  tradeoffs: string[];
  failureModes: string[];
  keyTerms: string[];
  commonPitfalls: string[];
  prerequisites?: string[];
  references?: Reference[];
};

function bullets(items: string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}

function rubric(terms: string[]) {
  const framingTerms = terms.slice(0, 2);
  const designTerms = terms.slice(1, 4);
  const operationTerms = terms.slice(-2);

  return [
    {
      dimension: "Problem framing",
      weight: 25,
      mustMention: framingTerms,
      scoreGuide: {
        0: "Does not establish the workload or success condition.",
        1: "Names a component but does not connect it to the stated scenario.",
        2: "Identifies the basic requirement and one relevant constraint.",
        3: "Frames the important correctness, scale, and user-impact questions.",
        4: "Makes assumptions explicit and prioritizes the risks that change the design."
      }
    },
    {
      dimension: "Technical design",
      weight: 45,
      mustMention: designTerms,
      scoreGuide: {
        0: "Provides no workable mechanism.",
        1: "Suggests a technology without explaining how it satisfies the requirement.",
        2: "Describes a plausible happy path with important gaps.",
        3: "Explains data flow, boundaries, and the important trade-offs correctly.",
        4: "Defends a coherent design, including edge cases and alternative choices."
      }
    },
    {
      dimension: "Failure handling & verification",
      weight: 30,
      mustMention: operationTerms,
      scoreGuide: {
        0: "Ignores retries, failure, and validation.",
        1: "Mentions monitoring or testing only as a slogan.",
        2: "Names one realistic failure mode and a partial mitigation.",
        3: "Covers recovery, observability, and a way to verify the behavior.",
        4: "Anticipates operational signals, rollback/recovery, and user-visible consequences."
      }
    }
  ];
}

function makeQuestion(moduleId: string, blueprint: QuestionBlueprint): InterviewQuestion {
  const tags = [...new Set([moduleId, ...blueprint.tags])];
  const answerSections = [
    {
      heading: "Recommended approach",
      markdown: `${blueprint.summary}\n\n${bullets(blueprint.answerPoints)}`
    },
    {
      heading: "Trade-offs and failure modes",
      markdown: `**Trade-offs**\n${bullets(blueprint.tradeoffs)}\n\n**Failure modes to address**\n${bullets(
        blueprint.failureModes
      )}`
    }
  ];

  return {
    id: `${blueprint.primaryTopicId}:${blueprint.slug}`,
    slug: blueprint.slug,
    version: 1,
    status: "published",
    moduleId,
    primaryTopicId: blueprint.primaryTopicId,
    title: blueprint.title,
    type: blueprint.type,
    difficulty: blueprint.difficulty,
    estimatedMinutes: blueprint.estimatedMinutes,
    tags,
    prerequisites: blueprint.prerequisites ?? [],
    prompt: {
      question: blueprint.question,
      ...(blueprint.scenario ? { scenario: blueprint.scenario } : {}),
      ...(blueprint.requirements ? { requirements: blueprint.requirements } : {}),
      ...(blueprint.constraints ? { constraints: blueprint.constraints } : {}),
      followUps: blueprint.followUps
    },
    hints: blueprint.hints,
    answer: {
      summary: blueprint.summary,
      sections: answerSections,
      tradeoffs: blueprint.tradeoffs,
      failureModes: blueprint.failureModes,
      keyTerms: blueprint.keyTerms
    },
    rubric: rubric(blueprint.keyTerms),
    commonPitfalls: blueprint.commonPitfalls,
    references: blueprint.references ?? references["foundations"],
    reviewedAt: REVIEWED_AT
  };
}

function makeModuleQuestion(
  moduleId: string,
  defaultReferences: Reference[],
  blueprint: QuestionBlueprint
): InterviewQuestion {
  return makeQuestion(moduleId, {
    ...blueprint,
    references: blueprint.references ?? defaultReferences
  });
}

const redisQuestions: InterviewQuestion[] = [
  makeQuestion("redis", {
    slug: "choose-redis-data-structures-for-live-leaderboard",
    primaryTopicId: "redis-data-models",
    title: "Choose Redis data structures for a live game leaderboard",
    type: "design",
    difficulty: "foundation",
    estimatedMinutes: 15,
    tags: ["leaderboard", "sorted-sets", "data-modeling"],
    question:
      "A game needs a global top-100 leaderboard, a player's rank, and the scores immediately above and below that player. Which Redis structures and commands would you use, and what would you store in the primary database?",
    scenario:
      "Scores arrive after each completed match. Reads are much more frequent than score updates, but a player must not see an impossible rank.",
    requirements: [
      "Return the top 100 and a player's nearby rank in single-digit milliseconds.",
      "Keep a durable record that can rebuild the leaderboard after a cache loss."
    ],
    followUps: [
      "How would you handle ties without making ordering non-deterministic?",
      "What changes if each region needs its own leaderboard plus a global view?"
    ],
    hints: [
      "Start from the read operations, not from a generic key-value schema.",
      "A sorted set stores member-to-score mappings and can answer rank-range queries.",
      "Explain where score updates are durably recorded before treating Redis as a projection."
    ],
    summary:
      "Use a Redis sorted set keyed by leaderboard scope for ranking reads, while keeping the authoritative match and score history in a durable database or event log.",
    answerPoints: [
      "Store each player id as a sorted-set member and score as its score; use reverse-range and reverse-rank operations for the top list and player context.",
      "Define tie behavior explicitly, for example encode a deterministic secondary value or return equal-score players in a documented order.",
      "Write the authoritative score update transactionally first, then update or rebuild the Redis projection through an idempotent worker.",
      "Shard by leaderboard scope when one sorted set becomes a hot key, and accept that a truly global exact ranking may need aggregation."
    ],
    tradeoffs: [
      "A single sorted set gives simple exact ranks but concentrates write load on one key.",
      "Approximate or time-windowed global rankings scale better but change the product semantics."
    ],
    failureModes: [
      "Losing Redis must trigger a replay or rebuild rather than losing score history.",
      "Concurrent non-monotonic score updates can regress a score unless the update is versioned or atomic."
    ],
    keyTerms: ["sorted set", "rank", "projection", "idempotent rebuild"],
    commonPitfalls: [
      "Using a Redis list and scanning it for every rank lookup.",
      "Treating the in-memory leaderboard as the only durable source of player scores."
    ],
    references: references.redis
  }),
  makeQuestion("redis", {
    slug: "design-cache-aside-product-catalog",
    primaryTopicId: "redis-data-models",
    title: "Design cache-aside for a product catalog",
    type: "design",
    difficulty: "intermediate",
    estimatedMinutes: 20,
    tags: ["cache-aside", "invalidation", "catalog"],
    question:
      "Design the cache behavior for a product-detail API backed by a relational database. Product reads are 30,000 requests per second and updates are rare but price changes must become visible quickly.",
    scenario:
      "The API can tolerate a few seconds of stale descriptions, but not a stale price after a promotional price is committed.",
    requirements: [
      "Avoid database overload during normal reads and Redis outages.",
      "Make the price visibility guarantee explicit and testable."
    ],
    constraints: ["The database remains the source of truth.", "Clients may retry failed GET requests."],
    followUps: [
      "When would you choose write-through instead of explicit invalidation?",
      "How would you avoid serving a price from an old cache fill that races with an update?"
    ],
    hints: [
      "Describe cache-miss behavior separately from update behavior.",
      "Cache keys should include the product identity and any response-shaping dimension.",
      "A delete or version check can be safer than trying to mutate every cached representation."
    ],
    summary:
      "Use cache-aside reads with bounded TTLs and an update path that commits the database transaction before invalidating or versioning relevant cache entries; isolate price correctness from looser catalog freshness.",
    answerPoints: [
      "On a hit, return the validated cached representation; on a miss, read the database, populate Redis with a TTL, and return the database result.",
      "After the price transaction commits, publish an invalidation event or delete the precise product-price key so the next read refills from the authoritative value.",
      "Use a version or updated-at value in the cached payload to prevent a late cache fill from overwriting a newer version.",
      "Bound database concurrency and degrade deliberately during a Redis outage rather than allowing every request to stampede the database."
    ],
    tradeoffs: [
      "Short TTLs reduce stale exposure but increase database traffic and cache churn.",
      "Fine-grained keys make invalidation precise but require disciplined key naming and observability."
    ],
    failureModes: [
      "An invalidation sent before the transaction commits allows a refill of the old value.",
      "A Redis outage can turn a cache layer into an amplification path without request coalescing or limits."
    ],
    keyTerms: ["cache-aside", "invalidation", "versioning", "stampede protection"],
    commonPitfalls: [
      "Assuming a TTL alone provides a price-correctness guarantee.",
      "Updating the database and cache independently without considering their failure order."
    ],
    prerequisites: ["data-modeling-basics"],
    references: references.redis
  }),
  makeQuestion("redis", {
    slug: "prevent-cache-stampede-on-expensive-profile",
    primaryTopicId: "redis-data-models",
    title: "Prevent a cache stampede on an expensive profile endpoint",
    type: "design",
    difficulty: "senior",
    estimatedMinutes: 25,
    tags: ["cache-stampede", "single-flight", "ttl"],
    question:
      "A celebrity profile key expires exactly when a live event starts. Thousands of requests miss simultaneously and the database query takes 800 ms. Design a safe recovery path without turning Redis into a single point of failure.",
    scenario:
      "The profile can be up to 60 seconds stale during the event, but a database cascade would impact unrelated traffic.",
    requirements: [
      "Keep the database query fan-out bounded during an expiry burst.",
      "Do not block all readers behind an unbounded lock wait."
    ],
    followUps: [
      "How would you react when the refresh worker itself is slow or crashes?",
      "Why is adding random jitter to TTLs useful but insufficient by itself?"
    ],
    hints: [
      "Separate fresh data from acceptable stale data.",
      "Let one caller refresh while other callers can consume a bounded stale value.",
      "Set a lease expiration and think about what happens after the lease holder pauses."
    ],
    summary:
      "Combine randomized expirations with stale-while-revalidate and a short, fenced refresh lease so one bounded worker refreshes while other callers receive an explicitly acceptable stale response.",
    answerPoints: [
      "Store a payload with fresh-until and stale-until timestamps; serve it normally while fresh and serve stale only within the product-approved grace window.",
      "Use an atomic lease acquisition such as SET with NX and a short expiration to elect one refresher; other requests do not wait indefinitely.",
      "Protect the database with per-key and global concurrency limits, timeouts, and a fallback response if both cache and source are unhealthy.",
      "Add TTL jitter before the event, measure refresh contention, and test lease expiry plus delayed refresh writes."
    ],
    tradeoffs: [
      "Serving stale values preserves availability but requires a clear business staleness budget.",
      "A distributed lease reduces duplicate work but is not a universal correctness lock."
    ],
    failureModes: [
      "A paused lease holder can write after a later holder unless payload versions or fencing are checked.",
      "A global lock around every cache fill serializes unrelated keys and becomes a bottleneck."
    ],
    keyTerms: ["stale-while-revalidate", "lease", "ttl jitter", "fencing token"],
    commonPitfalls: [
      "Making every request wait synchronously for the cache refresh.",
      "Using an expiration with no stale window, jitter, or source-protection plan."
    ],
    references: references.redis
  }),
  makeQuestion("redis", {
    slug: "choose-ttl-and-eviction-policy",
    primaryTopicId: "redis-data-models",
    title: "Choose TTLs and eviction policy for a shared Redis cluster",
    type: "compare",
    difficulty: "intermediate",
    estimatedMinutes: 18,
    tags: ["ttl", "eviction", "memory"],
    question:
      "One Redis cluster holds disposable API cache entries, user sessions, and rate-limit counters. It is approaching maxmemory. Which data should be allowed to evict, which policy would you consider, and what would you change in the topology?",
    scenario:
      "Evicting an API response is acceptable; evicting an active session without a fallback logs the user out.",
    requirements: [
      "Avoid a silent product behavior change under memory pressure.",
      "Explain how TTL and eviction policy interact."
    ],
    followUps: [
      "Why is allkeys-lru not automatically a safe default?",
      "Which metrics tell you that maxmemory pressure is becoming user-visible?"
    ],
    hints: [
      "Classify keys by loss tolerance before naming a policy.",
      "Expiration only makes a key eligible to disappear at a time; eviction decides behavior at memory pressure.",
      "Consider workload isolation, not only a smarter global policy."
    ],
    summary:
      "Separate eviction-tolerant cache data from session and coordination state where possible, set intentional TTLs, and select a policy whose eligible-key set matches the loss contract rather than relying on a shared all-keys policy.",
    answerPoints: [
      "Put disposable cache entries on explicit TTLs and, if co-located temporarily, use an eviction policy that only considers TTL-bearing keys when every such key is safe to lose.",
      "Keep sessions durable elsewhere or isolate them in a Redis deployment whose maxmemory policy cannot silently evict them.",
      "Size memory with fragmentation and replication headroom, then alert on evictions, expired keys, memory ratio, hit rate, and command latency.",
      "Use key prefixes and ownership documentation so teams cannot accidentally place durable state in an eviction-prone cluster."
    ],
    tradeoffs: [
      "Separate clusters cost more operationally but make failure semantics comprehensible.",
      "A noeviction policy preserves data semantics but pushes callers to handle write errors explicitly."
    ],
    failureModes: [
      "A rate limiter that cannot increment during noeviction may fail open or fail closed unless designed intentionally.",
      "Evictions can mask a capacity problem until database load or login failures spike."
    ],
    keyTerms: ["maxmemory", "eviction policy", "ttl", "workload isolation"],
    commonPitfalls: [
      "Putting sessions and disposable cache values under the same unexamined LRU policy.",
      "Interpreting a high cache hit rate as proof that eviction behavior is safe."
    ],
    references: references.redis
  }),
  makeQuestion("redis", {
    slug: "debug-blocking-keys-command",
    primaryTopicId: "redis-reliability",
    title: "Debug a production outage caused by KEYS",
    type: "debug",
    difficulty: "intermediate",
    estimatedMinutes: 15,
    tags: ["keys", "scan", "latency", "operations"],
    question:
      "A maintenance endpoint calls KEYS user:* on a Redis primary with tens of millions of keys. Latency rises sharply for every client. Explain why, contain the incident, and redesign the endpoint.",
    scenario:
      "The endpoint was intended to count user-related keys before a migration and runs once per hour.",
    followUps: [
      "Why is SCAN safer but still not a precise snapshot?",
      "What alternative data model avoids keyspace-wide discovery altogether?"
    ],
    hints: [
      "Redis command execution is primarily single-threaded for data operations.",
      "A command can be logically read-only and still block other work.",
      "Consider maintaining an explicit index at write time instead of discovering keys later."
    ],
    summary:
      "KEYS performs a full keyspace scan synchronously and can monopolize the server; stop the command, use incremental SCAN only with bounded work, and redesign around explicit metadata or an offline replica workflow.",
    answerPoints: [
      "Contain the incident by disabling the endpoint, canceling the expensive client where safe, and observing command latency, slow log, CPU, and client queues.",
      "Use SCAN with a cursor, limited batches, backoff, and duplicate-tolerant processing if incremental discovery is truly required.",
      "Do not treat SCAN results as a point-in-time transaction: keys may be added, removed, or returned more than once during iteration.",
      "For migrations, record membership in a purpose-built set, database table, or out-of-band inventory rather than querying an unbounded keyspace."
    ],
    tradeoffs: [
      "SCAN lowers per-call blocking risk but spreads work over time and increases operational complexity.",
      "Maintaining an index adds write-path responsibility but makes later operations predictable."
    ],
    failureModes: [
      "Retrying KEYS from multiple maintenance workers amplifies the outage.",
      "A SCAN consumer that assumes uniqueness can double-process keys."
    ],
    keyTerms: ["KEYS", "SCAN", "single-threaded event loop", "incremental iteration"],
    commonPitfalls: [
      "Calling KEYS in production because it was fast in a development dataset.",
      "Replacing KEYS with SCAN without rate limits or duplicate-safe processing."
    ],
    references: references.redis
  }),
  makeQuestion("redis", {
    slug: "implement-sliding-window-rate-limiter",
    primaryTopicId: "redis-streams-patterns",
    title: "Implement a sliding-window rate limiter with Redis",
    type: "design",
    difficulty: "senior",
    estimatedMinutes: 25,
    tags: ["rate-limiting", "lua", "sorted-sets"],
    question:
      "Design a per-account API rate limiter allowing 100 requests per rolling minute across a fleet of stateless API servers. It must not permit materially more than the limit under concurrent requests.",
    scenario:
      "An account can send bursts from several devices, and endpoint cost differs between read and write operations.",
    requirements: [
      "Make the check and increment atomic.",
      "Ensure limiter keys eventually disappear for inactive accounts."
    ],
    followUps: [
      "When is a token bucket a better fit than an exact sliding window?",
      "How would you avoid a hot key for one abusive tenant?"
    ],
    hints: [
      "Multiple Redis commands from a client are not a single atomic decision.",
      "A sorted set can store request timestamps, but cleanup and counting must be one operation.",
      "Think about clock source and key expiry."
    ],
    summary:
      "Use an atomic server-side operation, commonly a Lua script, to remove timestamps outside the window, count the remaining requests, add the new request if allowed, and refresh the key expiry.",
    answerPoints: [
      "Key by the enforcement identity and scope, for example account plus endpoint class, and include a unique member so simultaneous requests do not overwrite each other.",
      "Execute trim, count, conditional add, and expiry in one atomic script; return remaining quota and reset information for the API response.",
      "Use Redis server time or a disciplined time source to reduce skew, then decide whether the system should fail open or closed when Redis is unavailable.",
      "For weighted limits, store or consume cost units atomically, and protect the cluster from a single high-cardinality or hot identity."
    ],
    tradeoffs: [
      "Exact sliding windows are fairer but use more memory and operations than token buckets.",
      "Failing closed protects a downstream service but can turn a Redis outage into an API outage."
    ],
    failureModes: [
      "Separate ZREMRANGEBYSCORE, ZCARD, and ZADD calls allow races that exceed the limit.",
      "Missing expirations make inactive limiter keys a memory leak."
    ],
    keyTerms: ["atomic script", "sliding window", "sorted set", "key expiry"],
    commonPitfalls: [
      "Using the client clock and assuming all servers agree exactly.",
      "Counting after adding without rolling back when the request is rejected."
    ],
    prerequisites: ["redis-data-models"],
    references: references.redis
  }),
  makeQuestion("redis", {
    slug: "evaluate-redis-distributed-lock",
    primaryTopicId: "redis-streams-patterns",
    title: "Evaluate a Redis distributed lock for inventory reservation",
    type: "design",
    difficulty: "senior",
    estimatedMinutes: 30,
    tags: ["distributed-locks", "leases", "fencing"],
    question:
      "A team wants to use a Redis lock so only one worker reserves a scarce inventory item at a time. A worker may pause for minutes during a GC stall. Is a Redis lock sufficient, and how would you make the write path safe?",
    scenario:
      "A duplicate reservation is expensive, and the inventory database can enforce conditional updates.",
    requirements: [
      "Do not let a stale lock holder commit after its lease expires.",
      "Explain what Redis availability guarantees are actually required."
    ],
    followUps: [
      "Why must lock release compare a unique token instead of deleting blindly?",
      "When would you avoid a lock entirely and use a conditional database update?"
    ],
    hints: [
      "A lock is normally a lease, not proof that the holder is still the current owner.",
      "Consider a worker that resumes after its TTL elapsed and another worker acquired the lock.",
      "The protected resource should reject stale writers."
    ],
    summary:
      "Treat Redis locks as best-effort leases and make correctness reside in a conditional inventory write protected by a monotonic fencing token or version; often the database condition alone is the cleaner solution.",
    answerPoints: [
      "Acquire with an atomic SET NX PX and a random ownership token, but never equate acquisition with indefinite exclusive authority.",
      "On release, use an atomic compare-and-delete script so an old worker cannot delete a newer owner's lease.",
      "Pass a fencing token or expected inventory version to the database; the database rejects writes from stale or reordered owners.",
      "Define behavior under Redis partition, failover, and timeout, and prefer one transactional conditional decrement when it satisfies the business invariant."
    ],
    tradeoffs: [
      "A lease can reduce contention but introduces timing and failover assumptions.",
      "Database conditional updates may reduce throughput but give a stronger correctness boundary."
    ],
    failureModes: [
      "A stalled worker resumes after expiration and overwrites a newer reservation without fencing.",
      "Deleting a lock by key alone releases a lease owned by another worker."
    ],
    keyTerms: ["lease", "fencing token", "compare-and-delete", "conditional write"],
    commonPitfalls: [
      "Presenting a Redis lock as a universal distributed transaction mechanism.",
      "Renewing a lease blindly without verifying ownership and progress."
    ],
    prerequisites: ["consistency-coordination"],
    references: references.redis
  }),
  makeQuestion("redis", {
    slug: "design-session-store-with-redis",
    primaryTopicId: "redis-data-models",
    title: "Design a Redis-backed web session store",
    type: "design",
    difficulty: "intermediate",
    estimatedMinutes: 18,
    tags: ["sessions", "security", "ttl"],
    question:
      "A web application wants server-side sessions in Redis instead of putting all user claims in a cookie. Design session creation, renewal, logout, and Redis outage behavior.",
    scenario:
      "Sessions last 30 days with activity-based renewal, and administrators need to revoke all sessions for a compromised account.",
    followUps: [
      "How do you prevent session fixation and protect the session id?",
      "What should happen if Redis is unavailable during an authenticated request?"
    ],
    hints: [
      "The browser should hold an opaque, high-entropy identifier rather than mutable authorization state.",
      "Model both one-session lookup and account-wide revocation.",
      "A TTL must be renewed deliberately and bounded by an absolute expiry."
    ],
    summary:
      "Store opaque, high-entropy session ids in secure cookies, keep minimal server-side session state with idle and absolute expirations, and maintain a bounded account-to-session index for revocation or use session versioning.",
    answerPoints: [
      "Rotate the identifier after authentication or privilege changes, store a hashed lookup value if threat modeling warrants it, and set Secure, HttpOnly, and appropriate SameSite cookie attributes.",
      "Use an atomic renewal pattern that extends idle TTL only while respecting a fixed absolute expiry; do not make sessions immortal through continuous traffic.",
      "For account-wide logout, track session ids in a set with cleanup or store an account session-version that invalidates older tokens.",
      "Choose and document fail-closed versus a short-lived verified fallback for Redis outages, based on the application risk profile."
    ],
    tradeoffs: [
      "Server-side sessions enable immediate revocation but make Redis availability part of authenticated request availability.",
      "An account session index simplifies revocation but needs cleanup to avoid orphaned members."
    ],
    failureModes: [
      "Renewing TTL on every request without an absolute limit creates effectively permanent sessions.",
      "Reusing a session id after login permits session fixation."
    ],
    keyTerms: ["opaque session id", "idle ttl", "absolute expiry", "session revocation"],
    commonPitfalls: [
      "Storing broad authorization claims in an unsigned or long-lived browser cookie.",
      "Forgetting to regenerate a session identifier after authentication."
    ],
    references: references.redis
  }),
  makeQuestion("redis", {
    slug: "choose-rdb-aof-persistence",
    primaryTopicId: "redis-reliability",
    title: "Choose RDB and AOF persistence for Redis",
    type: "compare",
    difficulty: "senior",
    estimatedMinutes: 22,
    tags: ["persistence", "rdb", "aof"],
    question:
      "A Redis deployment holds a write-behind work queue and a cache. The team asks whether RDB snapshots or AOF is enough to survive a node loss. Explain the durability envelope and recommend an approach.",
    scenario:
      "The queue can replay a few seconds of work, but losing ten minutes would violate the product SLA.",
    requirements: [
      "Make the potential data-loss window explicit.",
      "Describe restart and disk-pressure implications."
    ],
    followUps: [
      "Why does persistence not replace replication or an external durable system of record?",
      "How would you test restore behavior rather than only backup creation?"
    ],
    hints: [
      "RDB is point-in-time snapshotting; AOF records write operations with a chosen fsync policy.",
      "Durability depends on both configuration and what has reached a recoverable disk.",
      "A queue's delivery guarantee should not rest on an untested local disk assumption."
    ],
    summary:
      "RDB gives compact point-in-time recovery while AOF narrows recovery loss according to its fsync policy; use both only when their documented recovery objective fits the workload, and keep irreplaceable work in an independently durable system.",
    answerPoints: [
      "Quantify the RDB loss window from snapshot cadence and the AOF loss window from fsync policy, including a process or host failure before data reaches stable storage.",
      "Use AOF rewrite and disk-capacity monitoring so append growth and compaction do not surprise production latency or storage.",
      "Combine persistence with replication for availability, but distinguish a replica's asynchronous state from a guarantee of zero loss.",
      "Run restore drills from actual artifacts, validate queue semantics after recovery, and decide whether the primary database or Kafka should own durable work."
    ],
    tradeoffs: [
      "AOF can reduce loss exposure but costs write I/O and can lengthen recovery.",
      "RDB snapshots are compact and fast to load but can lose all writes since the last snapshot."
    ],
    failureModes: [
      "Assuming every acknowledged Redis write is durable under every fsync configuration.",
      "Filling disk during AOF growth and then discovering persistence errors too late."
    ],
    keyTerms: ["rdb snapshot", "append-only file", "fsync", "restore drill"],
    commonPitfalls: [
      "Claiming persistence guarantees without specifying a failure model and recovery point objective.",
      "Using Redis persistence as the sole audit record for irreversible business events."
    ],
    references: references.redis
  }),
  makeQuestion("redis", {
    slug: "design-redis-replication-and-sentinel-failover",
    primaryTopicId: "redis-reliability",
    title: "Design Redis replication and Sentinel failover",
    type: "design",
    difficulty: "senior",
    estimatedMinutes: 25,
    tags: ["replication", "sentinel", "failover"],
    question:
      "Design a highly available Redis primary-replica deployment using Sentinel for a session service. Explain the write path, read path, failover behavior, and client configuration.",
    scenario:
      "Brief session write unavailability is preferable to accepting split-brain writes. Some stale reads are acceptable for non-security preferences.",
    followUps: [
      "What data loss can still occur during an asynchronous failover?",
      "How should clients discover the new primary without hard-coded hostnames?"
    ],
    hints: [
      "Replication is normally asynchronous, so replicas can lag.",
      "Sentinel handles monitoring and promotion, but clients still need topology awareness.",
      "Separate strong write expectations from optional replica reads."
    ],
    summary:
      "Send authoritative writes to the current primary, use replicas only for explicitly stale-tolerant reads, configure Sentinel quorum and client discovery, and acknowledge the bounded loss or unavailability trade-off during failover.",
    answerPoints: [
      "Deploy independent Sentinel processes across failure domains, tune quorum and down-after intervals to avoid flapping, and monitor both replication lag and failover events.",
      "Use a Sentinel-aware client that asks Sentinels for the current primary and reconnects on role changes rather than relying on a fixed endpoint.",
      "For sensitive session changes, read from the primary or use a write/read protocol that avoids assuming replica freshness.",
      "Choose durability settings and minimum replica requirements based on whether a recent write may be lost when a primary fails before replication completes."
    ],
    tradeoffs: [
      "Waiting for replicas improves loss resistance but increases write latency and can reduce availability.",
      "Replica reads improve capacity but make read-your-writes and revocation behavior harder."
    ],
    failureModes: [
      "A client continues writing to an old primary after topology change without robust reconnect behavior.",
      "An undersized or co-located Sentinel quorum cannot distinguish a failed primary from a network partition."
    ],
    keyTerms: ["asynchronous replication", "sentinel quorum", "primary discovery", "replication lag"],
    commonPitfalls: [
      "Calling a Sentinel deployment strongly consistent because it has replicas.",
      "Reading security-sensitive session state from a lagging replica."
    ],
    references: references.redis
  }),
  makeQuestion("redis", {
    slug: "explain-redis-cluster-hash-slots",
    primaryTopicId: "redis-reliability",
    title: "Explain Redis Cluster hash slots and multi-key operations",
    type: "concept",
    difficulty: "intermediate",
    estimatedMinutes: 18,
    tags: ["redis-cluster", "hash-slots", "sharding"],
    question:
      "Your team moves from a single Redis node to Redis Cluster. Explain how hash slots route keys, why a multi-key operation can fail with CROSSSLOT, and when hash tags are appropriate.",
    scenario:
      "A shopping cart uses keys for cart contents, cart coupon, and cart totals that must sometimes be updated atomically.",
    followUps: [
      "What operational risks come from putting too many keys under one hash tag?",
      "How do cluster clients behave while slots are migrating?"
    ],
    hints: [
      "Cluster routing is based on a fixed slot space, not arbitrary client-side modulo sharding.",
      "Atomic multi-key commands need their keys on the same shard.",
      "Hash tags choose the substring used for slot calculation."
    ],
    summary:
      "Redis Cluster maps every key to a hash slot; multi-key atomic operations require co-location, so use a narrow shared hash tag for genuinely coupled cart keys and avoid turning it into a global hotspot.",
    answerPoints: [
      "Explain that the client or cluster maps each key to one of the configured slots and redirects requests as ownership changes.",
      "CROSSSLOT protects the atomicity model: a command spanning independently owned slots cannot execute as one single-shard operation.",
      "Name cart keys with the same bounded tag, such as cart:{cart-id}:items and cart:{cart-id}:coupon, when they must be mutated together.",
      "Design around normal cluster-aware clients, retryable MOVED or ASK redirects, and metrics for slot balance and hot shards."
    ],
    tradeoffs: [
      "Co-location preserves atomic operations but lowers distribution granularity for related keys.",
      "Cross-shard workflows can scale better but must use application-level compensation rather than a multi-key command."
    ],
    failureModes: [
      "Using one constant hash tag places an entire workload on a single slot.",
      "A non-cluster-aware client fails or loops during slot migration redirects."
    ],
    keyTerms: ["hash slot", "crossslot", "hash tag", "cluster-aware client"],
    commonPitfalls: [
      "Assuming every Redis command remains transparently atomic after sharding.",
      "Choosing hash tags by feature name rather than by bounded aggregate identity."
    ],
    references: references.redis
  }),
  makeQuestion("redis", {
    slug: "mitigate-redis-hot-key",
    primaryTopicId: "redis-reliability",
    title: "Mitigate a Redis hot key during a flash sale",
    type: "debug",
    difficulty: "senior",
    estimatedMinutes: 22,
    tags: ["hot-keys", "scalability", "flash-sale"],
    question:
      "A flash-sale inventory key receives hundreds of thousands of reads per second and one Redis shard is saturated while the rest of the cluster is idle. Diagnose the issue and propose safe mitigations.",
    scenario:
      "The displayed inventory can be slightly stale, but actual purchase reservation must remain correct.",
    followUps: [
      "Why does adding shards not automatically solve a single-key hotspot?",
      "How would you separate display inventory from reservation authority?"
    ],
    hints: [
      "A key maps to one slot and one shard at a time.",
      "Read scaling and correctness-critical mutation do not have to use the same representation.",
      "Observe per-command and per-key traffic before changing topology."
    ],
    summary:
      "Confirm the hot key with shard-level metrics, then fan out cacheable display reads through replicas, edge caches, or duplicated read keys while keeping inventory reservation as a single correct conditional operation at its authoritative boundary.",
    answerPoints: [
      "Use command stats, slow logs, latency monitoring, and client-side tracing to distinguish a hot key from network, CPU, or broad memory pressure.",
      "Cache or push approximate display counts with short TTLs and replication-aware read routing if staleness is acceptable.",
      "Keep the reserve path serialized or conditionally updated against an authoritative database or a deliberately coordinated inventory service.",
      "Apply admission control and per-user limits so abusive traffic cannot consume all hot-key capacity."
    ],
    tradeoffs: [
      "Duplicating reads improves throughput but creates a bounded inconsistency window.",
      "Serializing a reservation preserves correctness but limits peak write throughput."
    ],
    failureModes: [
      "Splitting inventory counters without an atomic aggregate reservation can oversell stock.",
      "Sending every display refresh to the primary simply moves the bottleneck."
    ],
    keyTerms: ["hot key", "read replica", "admission control", "conditional reservation"],
    commonPitfalls: [
      "Recommending more cluster nodes without explaining a single key's slot affinity.",
      "Using eventually consistent display values as proof that inventory is available."
    ],
    references: references.redis
  }),
  makeQuestion("redis", {
    slug: "diagnose-redis-memory-fragmentation",
    primaryTopicId: "redis-reliability",
    title: "Diagnose Redis memory fragmentation and eviction pressure",
    type: "debug",
    difficulty: "senior",
    estimatedMinutes: 20,
    tags: ["memory", "fragmentation", "eviction"],
    question:
      "Redis reports used_memory well below maxmemory, but the host is close to its cgroup limit and latency spikes during a background save. How would you diagnose and mitigate the problem?",
    scenario:
      "The workload stores variable-sized JSON blobs and performs frequent updates and expirations.",
    followUps: [
      "How can copy-on-write during persistence increase resident memory?",
      "Why is simply raising maxmemory not always safe?"
    ],
    hints: [
      "Allocator resident memory and Redis logical used memory are different signals.",
      "Background forked processes can duplicate modified pages through copy-on-write.",
      "Look at value shape, churn, persistence timing, and headroom together."
    ],
    summary:
      "Compare logical memory, allocator RSS, fragmentation ratio, and background persistence behavior; reserve cgroup headroom for copy-on-write, reduce pathological value churn, and tune persistence or topology from measured evidence.",
    answerPoints: [
      "Inspect INFO memory and persistence fields alongside host RSS, eviction count, fork time, and latency events to establish whether fragmentation or copy-on-write is the dominant contributor.",
      "Avoid operating maxmemory at the container limit; leave space for allocator fragmentation, replication buffers, client buffers, and forked persistence pages.",
      "Reduce oversized or highly volatile values, choose appropriate data structures, and consider active defragmentation only after understanding its CPU effect.",
      "Move persistence-heavy or volatile cache workloads apart when their memory profiles make shared headroom unreliable."
    ],
    tradeoffs: [
      "Defragmentation can reclaim memory but consumes CPU and can affect latency.",
      "Less frequent snapshots reduce fork pressure but enlarge the recovery point objective."
    ],
    failureModes: [
      "The OS kills Redis despite logical used_memory appearing safe.",
      "A background save coincides with high write churn and creates a copy-on-write memory surge."
    ],
    keyTerms: ["rss", "fragmentation ratio", "copy-on-write", "memory headroom"],
    commonPitfalls: [
      "Setting maxmemory equal to container memory.",
      "Diagnosing a memory incident from only one Redis metric."
    ],
    references: references.redis
  }),
  makeQuestion("redis", {
    slug: "investigate-redis-latency-spike",
    primaryTopicId: "redis-reliability",
    title: "Investigate periodic Redis latency spikes",
    type: "debug",
    difficulty: "intermediate",
    estimatedMinutes: 18,
    tags: ["latency", "slowlog", "observability"],
    question:
      "A service sees 200 ms Redis latency spikes every few minutes, although average latency is low. Walk through an investigation plan that distinguishes network, command, persistence, and client causes.",
    scenario:
      "The application uses both large hash operations and a periodic background snapshot.",
    followUps: [
      "What evidence would make you suspect a slow client rather than a slow Redis command?",
      "How do you prevent the next incident after finding one offending command?"
    ],
    hints: [
      "Averages hide tail latency and temporal correlation.",
      "Collect Redis-internal latency events and command-level data before tuning timeouts.",
      "Client queues, network RTT, and server command time are separate spans."
    ],
    summary:
      "Correlate client-side spans with Redis command latency, slow log, latency monitor, persistence events, CPU, network RTT, and connection pools; fix the identified long operation or saturation source rather than increasing every timeout.",
    answerPoints: [
      "Instrument request timing around connection acquisition, network round trip, command execution, and response deserialization so the slow segment is visible.",
      "Inspect slow log and latency diagnostics for expensive commands, large values, fork activity, eviction, and blocked clients around the spike window.",
      "Check connection-pool exhaustion, DNS or TLS churn, packet loss, and cross-zone routing before blaming Redis itself.",
      "Add guardrails such as command allowlists, value-size limits, dashboards, and load tests that reproduce the observed tail pattern."
    ],
    tradeoffs: [
      "More detailed tracing costs some overhead but sharply reduces blind incident response.",
      "Tighter command limits protect the cluster but may require product-level pagination or batching."
    ],
    failureModes: [
      "Increasing client timeouts converts a visible latency issue into a larger queueing collapse.",
      "A periodic persistence fork is mistaken for an application deployment because correlations are missing."
    ],
    keyTerms: ["tail latency", "slow log", "latency monitor", "connection pool"],
    commonPitfalls: [
      "Looking only at average Redis response time.",
      "Assuming the server is slow before measuring client-side queuing."
    ],
    references: references.redis
  }),
  makeQuestion("redis", {
    slug: "choose-redis-pubsub-or-streams",
    primaryTopicId: "redis-streams-patterns",
    title: "Choose Redis Pub/Sub or Streams for notification delivery",
    type: "compare",
    difficulty: "intermediate",
    estimatedMinutes: 16,
    tags: ["pubsub", "streams", "notifications"],
    question:
      "A service sends account-change notifications to several internal consumers. Some consumers can tolerate missed transient updates; one consumer must catch up after downtime. Compare Redis Pub/Sub and Redis Streams for this use case.",
    scenario:
      "Each event is small, consumers are independently deployed, and the durable consumer must process each change at least once.",
    followUps: [
      "How would you handle a consumer that is down for a day?",
      "What does Streams not solve by itself about external side effects?"
    ],
    hints: [
      "Pub/Sub distributes only to connected subscribers.",
      "Streams persist entries and maintain consumer-group delivery state.",
      "At-least-once delivery still requires idempotent consumers."
    ],
    summary:
      "Use Pub/Sub for best-effort live fanout only, and Redis Streams with a consumer group for consumers that need retention, pending-entry recovery, and at-least-once processing semantics.",
    answerPoints: [
      "Pub/Sub messages disappear for disconnected subscribers, which is acceptable for ephemeral UI refreshes but not for a durable projection.",
      "A Stream retains entries according to trimming policy; consumer groups track delivered and pending messages per group.",
      "Set retention from outage duration, throughput, and storage budget, then monitor pending counts and age.",
      "Make the durable consumer idempotent because retries, claims, and crashes can cause an entry's effects to be attempted again."
    ],
    tradeoffs: [
      "Pub/Sub is simple and low-overhead but provides no replay.",
      "Streams offer recovery state but require retention, consumer ownership, and pending-entry operations."
    ],
    failureModes: [
      "Choosing Pub/Sub for a consumer that silently misses changes during deployment.",
      "Assuming a Stream acknowledgment makes an external database write exactly once."
    ],
    keyTerms: ["pubsub", "stream retention", "consumer group", "pending entries"],
    commonPitfalls: [
      "Calling Pub/Sub a queue because it has channels and subscribers.",
      "Trimming a stream sooner than the longest expected consumer outage."
    ],
    references: references.redis
  }),
  makeQuestion("redis", {
    slug: "recover-redis-streams-pending-work",
    primaryTopicId: "redis-streams-patterns",
    title: "Recover pending work in a Redis Streams consumer group",
    type: "design",
    difficulty: "senior",
    estimatedMinutes: 24,
    tags: ["redis-streams", "consumer-groups", "recovery"],
    question:
      "A worker reads a Redis Stream entry, writes an email request to a database, then crashes before XACK. Describe a robust worker loop and how another worker should recover pending entries.",
    scenario:
      "Emails must not be sent twice if avoidable, but a request must not disappear because a worker died.",
    requirements: [
      "Explain the relationship between acknowledging and committing the external side effect.",
      "Avoid having all workers repeatedly steal fresh work."
    ],
    followUps: [
      "How would you identify entries abandoned by a dead consumer?",
      "What database constraint makes an at-least-once worker safe for email requests?"
    ],
    hints: [
      "A Stream group's pending entries list records deliveries not yet acknowledged.",
      "Acknowledge only after the durable effect is safely committed.",
      "A claimed entry may have been processed already, so use an idempotency key."
    ],
    summary:
      "Process Stream entries with an idempotent database write keyed by event id, acknowledge only after that transaction commits, and use idle-time-based pending-entry claiming to recover work from failed consumers.",
    answerPoints: [
      "Read new messages for the group, validate the payload, and write a durable outbox or request row with a unique event id before XACK.",
      "If a crash occurs before XACK, the entry remains pending; another consumer uses XPENDING/XAUTOCLAIM or a bounded claim strategy after an idle threshold.",
      "The durable write must reject duplicate event ids, letting a retried or claimed message converge safely before it is acknowledged.",
      "Track pending count, oldest pending age, claim rate, retry count, and poison-message outcomes so recovery does not become a hidden backlog."
    ],
    tradeoffs: [
      "Longer idle thresholds reduce false claims of slow workers but delay recovery after a crash.",
      "An idempotency table adds storage but gives a clear durable boundary for retries."
    ],
    failureModes: [
      "Acknowledging before the database transaction commits loses work permanently on a crash.",
      "Claiming immediately can duplicate work that a slow but healthy worker is still processing."
    ],
    keyTerms: ["pending entries list", "xack", "xautoclaim", "idempotency key"],
    commonPitfalls: [
      "Treating a pending message as proof that no side effect occurred.",
      "Building recovery only for new messages and ignoring idle pending entries."
    ],
    references: references.redis
  }),
  makeQuestion("redis", {
    slug: "design-idempotent-redis-stream-worker",
    primaryTopicId: "redis-streams-patterns",
    title: "Design an idempotent Redis Streams order worker",
    type: "design",
    difficulty: "senior",
    estimatedMinutes: 25,
    tags: ["redis-streams", "idempotency", "outbox"],
    question:
      "An order service emits work to Redis Streams for invoice generation. Build an end-to-end design that survives producer retries, worker retries, and a database outage without generating duplicate invoices.",
    scenario:
      "The order database owns the order state, while a separate invoice service owns invoice records.",
    followUps: [
      "Where would an outbox fit if the order write and stream append cannot be atomic?",
      "How should a permanently malformed event be handled?"
    ],
    hints: [
      "There are two separate atomicity boundaries: order write to stream, and stream delivery to invoice write.",
      "A stable business event id is more useful than a transport delivery count.",
      "Make poison-event handling observable rather than endlessly retrying it."
    ],
    summary:
      "Use a durable outbox to bridge the order transaction to Stream publication, include a stable event id, make invoice creation unique on that id or order version, and acknowledge only after the invoice transaction succeeds.",
    answerPoints: [
      "Write order state and an outbox row in one database transaction; a relay publishes the outbox idempotently and records completion or tolerates duplicate append attempts.",
      "Include order id, version, event id, schema version, and causation metadata in the Stream message so the invoice service can validate and deduplicate.",
      "Use a unique constraint on the invoice's source event id, then treat duplicate delivery as a successful no-op before XACK.",
      "Apply retry budgets, backoff, pending-entry recovery, and a quarantined failure path with enough context to repair safely."
    ],
    tradeoffs: [
      "An outbox adds a relay and storage lifecycle, but removes a lost-event gap.",
      "Deduplicating by source event preserves correctness but requires stable identifiers and retention."
    ],
    failureModes: [
      "Publishing directly after an order commit can lose an invoice event if the process crashes in between.",
      "Retrying an invoice send without a unique source-event constraint creates duplicate customer charges or emails."
    ],
    keyTerms: ["transactional outbox", "source event id", "unique constraint", "poison message"],
    commonPitfalls: [
      "Claiming exactly-once because the worker calls XACK.",
      "Using a transient connection id as the idempotency key."
    ],
    prerequisites: ["kafka-delivery-schema"],
    references: references.redis
  }),
  makeQuestion("redis", {
    slug: "design-cache-invalidation-for-user-profile",
    primaryTopicId: "redis-data-models",
    title: "Design cache invalidation for user profiles across services",
    type: "design",
    difficulty: "senior",
    estimatedMinutes: 25,
    tags: ["cache-invalidation", "events", "versioning"],
    question:
      "A profile update affects a profile API cache, a search projection cache, and a recommendation cache. Design invalidation so all services eventually converge and no service overwrites a newer profile with an older event.",
    scenario:
      "Services consume events asynchronously and may be temporarily offline.",
    followUps: [
      "When is delete-on-write safer than writing the new cache value directly?",
      "How would you trace a stale cache report from a user to a failed invalidation?"
    ],
    hints: [
      "Each cache is a projection with a different freshness contract.",
      "Events need identity and ordering information, not just a user id.",
      "An old delivery can arrive after a newer one."
    ],
    summary:
      "Publish versioned profile-change events from a durable outbox, let each service invalidate or rebuild its own projection idempotently, and reject cache writes older than the latest known profile version.",
    answerPoints: [
      "Commit profile state and an event with aggregate id, monotonic version, event id, and changed fields in one durable transaction.",
      "For the profile API, delete or version the cache after commit; for derived caches, consumers update only if the incoming version is newer than the projection's stored version.",
      "Use TTLs as a safety net rather than the only propagation mechanism, and expose cache age/version in diagnostics where appropriate.",
      "Monitor event lag, invalidation success, cache hit age, and per-user trace correlation to investigate stale reports."
    ],
    tradeoffs: [
      "Direct writes can reduce refill latency but increase the race surface across multiple cache representations.",
      "Delete-on-write is simpler but shifts work to the next reader and needs stampede protection."
    ],
    failureModes: [
      "An old asynchronous event overwrites a cache entry built from a newer profile version.",
      "A service outage discards invalidations unless it has durable replay or a periodic reconciliation path."
    ],
    keyTerms: ["versioned event", "outbox", "projection", "stale write"],
    commonPitfalls: [
      "Broadcasting a bare user id and assuming every service can infer correct ordering.",
      "Calling cache invalidation complete without metrics for propagation delay."
    ],
    references: references.redis
  }),
  makeQuestion("redis", {
    slug: "plan-redis-disaster-recovery",
    primaryTopicId: "redis-reliability",
    title: "Plan Redis disaster recovery for mixed workloads",
    type: "design",
    difficulty: "senior",
    estimatedMinutes: 28,
    tags: ["disaster-recovery", "backup", "rto-rpo"],
    question:
      "A regional outage destroys a Redis deployment used for cache, sessions, rate limits, and a Stream-based background job buffer. Create a recovery plan with concrete RTO/RPO behavior for each workload.",
    scenario:
      "The application can route to another region, but no shared Redis storage exists today.",
    requirements: [
      "Do not give every workload the same durability promise.",
      "Identify changes that should happen before the next outage."
    ],
    followUps: [
      "Which workloads should be moved out of Redis rather than replicated?",
      "How would you prove that a restore meets the stated RTO?"
    ],
    hints: [
      "Recovery objectives are product decisions, not a backup checkbox.",
      "Cache can usually cold-start; sessions and job buffers need separate treatment.",
      "A runbook should include data validation, not only infrastructure creation."
    ],
    summary:
      "Classify each Redis workload by loss tolerance, use cold rebuild for cache, design session re-authentication or durable fallback deliberately, and move irrecoverable job intent to a durable outbox or stream system with tested cross-region recovery.",
    answerPoints: [
      "State RTO and RPO per workload: cache may have near-zero data value, sessions may require controlled re-login, rate limits may reset with abuse safeguards, and jobs need durable replayable intent.",
      "Automate replacement cluster provisioning, application configuration switch-over, cache warmup limits, and observability checks so recovery does not depend on manual memory.",
      "Store backups or durable source data in an independent failure domain, test restores regularly, and validate counts, versions, and critical user workflows after restore.",
      "Document safe degraded modes, ownership, communication templates, and post-recovery reconciliation for events that were in flight."
    ],
    tradeoffs: [
      "Cross-region replication can lower RPO but costs latency, complexity, and may still have asynchronous gaps.",
      "Requiring re-authentication is simpler than durable session replication but affects user experience."
    ],
    failureModes: [
      "Treating a Stream buffer as durable business intent without a backup or external source of truth.",
      "Restoring data successfully but overwhelming downstream databases during cache warmup."
    ],
    keyTerms: ["rto", "rpo", "independent failure domain", "restore validation"],
    commonPitfalls: [
      "Writing one generic DR plan for cache and business-critical queues.",
      "Testing backup creation but never measuring a full application recovery."
    ],
    references: references.redis
  }),
  makeQuestion("redis", {
    slug: "design-delayed-jobs-with-sorted-sets",
    primaryTopicId: "redis-streams-patterns",
    title: "Design delayed job scheduling with Redis sorted sets",
    type: "design",
    difficulty: "intermediate",
    estimatedMinutes: 20,
    tags: ["delayed-jobs", "sorted-sets", "atomicity"],
    question:
      "A product needs to schedule reminder jobs for future delivery. Explain how a Redis sorted set can find due work, how workers claim it safely, and when you would choose a durable queue instead.",
    scenario:
      "Several workers poll every second and a worker can crash after claiming a job but before delivery.",
    followUps: [
      "Why is ZRANGEBYSCORE followed by ZREM not sufficient as two ordinary client commands?",
      "How would you recover a job that was claimed by a dead worker?"
    ],
    hints: [
      "Use the score as a due timestamp and the member as a stable job id.",
      "Claiming must be atomic with removal or movement to an in-flight state.",
      "Scheduled timing and durable business intent are separate requirements."
    ],
    summary:
      "Store scheduled job ids in a sorted set by due time, atomically move due jobs to an in-flight record, process them idempotently, and use a durable source or outbox when lost reminders are unacceptable.",
    answerPoints: [
      "Workers fetch only a bounded due range and use a Lua script or atomic move to claim each job so two workers cannot both own it.",
      "Record attempt, lease, and stable job id in an in-flight structure; reclaim expired leases and make the downstream delivery idempotent.",
      "Use timeouts, bounded batch sizes, and clock monitoring so a backlog does not cause a thundering poll or early execution.",
      "For critical reminders, persist scheduling intent in a transactional database or durable event log and treat Redis as an execution index."
    ],
    tradeoffs: [
      "Sorted sets are simple for time ordering but do not automatically provide a durable workflow history.",
      "A durable scheduler adds infrastructure but supports audited retries and regional recovery."
    ],
    failureModes: [
      "A worker crashes after removing a job and before recording in-flight state.",
      "A non-idempotent reminder side effect is duplicated when an expired lease is reclaimed."
    ],
    keyTerms: ["due timestamp", "atomic claim", "in-flight lease", "idempotent delivery"],
    commonPitfalls: [
      "Polling the entire sorted set or fetching an unbounded number of due jobs.",
      "Treating a Redis delayed queue as the only durable record of a customer commitment."
    ],
    references: references.redis
  })
];

const kafkaQuestions: InterviewQuestion[] = [
  makeModuleQuestion("kafka", references.kafka, {
    slug: "choose-topic-partitions-for-order-events",
    primaryTopicId: "kafka-core",
    title: "Choose topic partitions and keys for order events",
    type: "design",
    difficulty: "foundation",
    estimatedMinutes: 18,
    tags: ["partitions", "ordering", "order-events"],
    question:
      "An order service publishes OrderCreated, OrderPaid, and OrderCancelled events. Explain how you would choose a topic key and partition count so consumers see a sensible per-order sequence while the system can scale.",
    scenario:
      "There are millions of orders but a small number of merchants generate a disproportionate share of traffic.",
    followUps: [
      "What ordering does Kafka provide and what ordering does it not provide?",
      "How would you detect that a few keys are producing partition skew?"
    ],
    hints: [
      "Kafka ordering is scoped to a partition.",
      "A stable aggregate id is usually a better key than an event type.",
      "Partition count is a capacity and concurrency choice with lasting consequences."
    ],
    summary:
      "Key events by order id to preserve per-order partition ordering, choose partitions from forecast throughput and consumer parallelism, and measure key distribution so merchant hotspots do not silently dominate one partition.",
    answerPoints: [
      "Use the order id as the record key so all state changes for one order are routed to the same partition and observed in append order.",
      "Do not promise a total order across all orders or partitions; consumers must model independent aggregates accordingly.",
      "Size partitions with headroom for producer throughput, retention, consumer concurrency, replication, and future growth because increasing partitions changes key-to-partition mapping.",
      "Track bytes, records, lag, and processing time per partition and address extreme keys with product or routing changes rather than random keys that break order."
    ],
    tradeoffs: [
      "More partitions increase concurrency but add broker, file-handle, rebalancing, and recovery overhead.",
      "A stable aggregate key preserves local order but exposes a hot aggregate as a single-partition bottleneck."
    ],
    failureModes: [
      "Using random keys spreads load but allows cancellation to overtake payment for the same order.",
      "Adding partitions later can change routing for new records and surprise stateful consumers."
    ],
    keyTerms: ["record key", "partition ordering", "consumer parallelism", "partition skew"],
    commonPitfalls: [
      "Saying Kafka orders a topic globally.",
      "Selecting partition count only from today's message rate."
    ]
  }),
  makeModuleQuestion("kafka", references.kafka, {
    slug: "explain-producer-acks-and-isr",
    primaryTopicId: "kafka-core",
    title: "Explain producer acknowledgments and in-sync replicas",
    type: "concept",
    difficulty: "intermediate",
    estimatedMinutes: 18,
    tags: ["producer", "acks", "replication"],
    question:
      "Compare acks=0, acks=1, and acks=all for an order-event producer. Explain how in-sync replicas, replication factor, and minimum in-sync replicas affect the availability and loss trade-off.",
    scenario:
      "The business accepts a brief write error during a broker outage but does not want an acknowledged payment event to disappear after one broker dies.",
    followUps: [
      "What happens when the ISR count drops below min.insync.replicas with acks=all?",
      "Why does a replication factor of three alone not prove durable acknowledgments?"
    ],
    hints: [
      "Acks describes when the leader responds to the producer.",
      "ISR describes replicas sufficiently caught up to participate in acknowledged durability.",
      "Availability changes when the required replica set is not healthy."
    ],
    summary:
      "For loss-sensitive events, use acks=all with a replication factor and min.insync.replicas that require more than one healthy replica before acknowledgment, accepting write unavailability when that safety condition cannot be met.",
    answerPoints: [
      "acks=0 provides no broker acknowledgment, acks=1 waits for the leader, and acks=all waits for the configured in-sync replication condition.",
      "Set replication factor across failure domains and min.insync.replicas high enough that a single broker loss cannot erase an acknowledged record.",
      "With acks=all and insufficient ISR, produce requests should fail rather than silently lower durability, so callers need retry and business error behavior.",
      "Monitor under-replicated partitions, ISR shrink, produce errors, and disk/network saturation that precede a durability-versus-availability decision."
    ],
    tradeoffs: [
      "Stronger acknowledgment increases write latency and can reject writes during partial outages.",
      "Lower acknowledgments maximize apparent availability but widen the acknowledged-loss window."
    ],
    failureModes: [
      "A leader acknowledges under acks=1 then fails before a follower replicated the record.",
      "A team configures acks=all but leaves min.insync.replicas too low for its loss requirement."
    ],
    keyTerms: ["acks=all", "in-sync replicas", "min insync replicas", "under-replicated partition"],
    commonPitfalls: [
      "Equating replication factor with a guarantee independent of producer settings.",
      "Ignoring the application behavior when safe produces are rejected."
    ]
  }),
  makeModuleQuestion("kafka", references.kafka, {
    slug: "use-idempotent-kafka-producer",
    primaryTopicId: "kafka-delivery-schema",
    title: "Use an idempotent Kafka producer safely",
    type: "design",
    difficulty: "intermediate",
    estimatedMinutes: 20,
    tags: ["idempotent-producer", "retries", "duplicates"],
    question:
      "A producer times out waiting for a broker acknowledgment and retries the same OrderPaid event. Explain how producer idempotence changes the outcome and what duplicates can still exist in the end-to-end system.",
    scenario:
      "The payment service can retry after a network timeout, and consumers write to a separate database.",
    followUps: [
      "Why is an idempotent producer not equivalent to exactly-once business processing?",
      "What stable identity should the consumer store to protect its database?"
    ],
    hints: [
      "The broker can recognize retries from the same producer session and sequence.",
      "Producer idempotence protects Kafka append behavior, not every external side effect.",
      "Look for the next atomicity boundary after the consumer reads the record."
    ],
    summary:
      "Enable producer idempotence to avoid duplicate records from retrying a send to the same partition, then still use stable event ids and idempotent consumer writes because Kafka delivery and an external database transaction are separate boundaries.",
    answerPoints: [
      "Allow the producer to retry transient errors with idempotence enabled so the broker deduplicates sequence retries rather than appending a second copy.",
      "Use a stable event id derived from the business operation, not a producer sequence, in every event payload and downstream idempotency table.",
      "Configure retries, timeouts, and delivery timeout as one policy; do not disable retries merely to hide duplicate risks.",
      "Test timeout-after-append behavior and consumer restart behavior to demonstrate that every boundary is safe under repetition."
    ],
    tradeoffs: [
      "Idempotence adds protocol state but removes a common producer retry ambiguity.",
      "Consumer-side deduplication adds a storage lookup but protects external effects."
    ],
    failureModes: [
      "A consumer creates two invoices because it assumes a Kafka record is globally unique.",
      "A producer restart produces a semantically duplicate event with a new business id."
    ],
    keyTerms: ["idempotent producer", "sequence number", "stable event id", "external side effect"],
    commonPitfalls: [
      "Promising end-to-end exactly-once from producer configuration alone.",
      "Using the Kafka offset as an idempotency key across replays or different topics."
    ]
  }),
  makeModuleQuestion("kafka", references.kafka, {
    slug: "preserve-order-with-producer-retries",
    primaryTopicId: "kafka-core",
    title: "Preserve per-key order when producer retries occur",
    type: "debug",
    difficulty: "senior",
    estimatedMinutes: 20,
    tags: ["producer-retries", "ordering", "in-flight-requests"],
    question:
      "A consumer observes OrderShipped before OrderPacked for the same key during a partial broker outage. Walk through producer-side causes and configurations that preserve ordering without giving up reliability.",
    scenario:
      "The producer sends asynchronously and has several requests in flight per connection.",
    followUps: [
      "How does producer idempotence change retry ordering behavior?",
      "What must the consumer still validate even if the partition append order is correct?"
    ],
    hints: [
      "A retry of an earlier batch can race with a later successful batch.",
      "Ordering applies after the broker appends, not to arbitrary business clocks.",
      "A per-aggregate version can expose missing or invalid transitions."
    ],
    summary:
      "Use idempotent producers and compatible in-flight/retry settings so retries do not reorder records within a partition, and include aggregate versions so consumers can detect invalid state transitions beyond transport ordering.",
    answerPoints: [
      "Confirm both events use the same stable key and hence the same partition before diagnosing broker order.",
      "Enable idempotence and avoid configurations that permit a later batch to be accepted while an earlier retry is unresolved in a way the client cannot order safely.",
      "Carry an order version or expected predecessor so consumers can reject, buffer, or reconcile an impossible business transition.",
      "Trace producer retry events, partition offsets, leader changes, and deployment versions to isolate whether the cause is routing, retry policy, or business emission order."
    ],
    tradeoffs: [
      "Lowering in-flight concurrency can simplify ordering but limits producer throughput.",
      "Version-aware consumers add state but protect against bad producers and replay anomalies."
    ],
    failureModes: [
      "Two event types use different keys, so per-order ordering was never guaranteed.",
      "A consumer treats offset order as proof that the application's state machine is valid."
    ],
    keyTerms: ["in-flight requests", "producer retry", "partition order", "aggregate version"],
    commonPitfalls: [
      "Disabling retries as the primary fix for an ordering bug.",
      "Assuming a consumer can correct a partition-key design mistake."
    ]
  }),
  makeModuleQuestion("kafka", references.kafka, {
    slug: "design-consumer-group-rebalance",
    primaryTopicId: "kafka-core",
    title: "Design a consumer group that tolerates rebalances",
    type: "design",
    difficulty: "intermediate",
    estimatedMinutes: 22,
    tags: ["consumer-groups", "rebalance", "processing"],
    question:
      "Design a consumer group for image-processing events where one message can take 30 seconds. Explain partition assignment, heartbeat behavior, rebalances, and how to avoid duplicate external work.",
    scenario:
      "Workers autoscale during peak traffic and may be deployed frequently.",
    followUps: [
      "What happens when there are more consumers than partitions?",
      "How can long processing trigger an unnecessary rebalance?"
    ],
    hints: [
      "A partition is assigned to at most one consumer in a group at a time.",
      "Poll and heartbeat expectations interact with long-running processing.",
      "Rebalance means ownership can change before an old worker finishes its side effect."
    ],
    summary:
      "Match consumer parallelism to partition count, keep polling and heartbeats healthy while bounded worker pools process records, commit only after durable idempotent effects, and use cooperative assignment where appropriate to reduce disruption.",
    answerPoints: [
      "Explain that consumers in the same group share partitions, so extra consumers beyond partition count are idle and one slow partition caps its owner's throughput.",
      "Decouple polling from expensive work with bounded queues and pause/resume controls so the consumer does not exceed its poll interval or overload downstream systems.",
      "On partition revoke, stop accepting new work, complete or safely abandon owned work according to the commit boundary, then release ownership cleanly.",
      "Use idempotency keys in the image service because a rebalance can cause a record to be processed again after an uncommitted completion."
    ],
    tradeoffs: [
      "Larger worker pools improve throughput but make shutdown and backpressure coordination harder.",
      "Longer timeouts avoid false rebalances but delay recovery of a genuinely failed consumer."
    ],
    failureModes: [
      "Blocking the poll loop on a 30-second task causes the coordinator to revoke partitions.",
      "Committing before image storage succeeds loses work when the worker crashes."
    ],
    keyTerms: ["consumer group", "rebalance", "poll interval", "idempotent effect"],
    commonPitfalls: [
      "Scaling consumers without first checking partition count.",
      "Assuming a revoked consumer cannot finish a previously started side effect."
    ]
  }),
  makeModuleQuestion("kafka", references.kafka, {
    slug: "choose-offset-commit-strategy",
    primaryTopicId: "kafka-delivery-schema",
    title: "Choose an offset commit strategy for database consumers",
    type: "compare",
    difficulty: "intermediate",
    estimatedMinutes: 18,
    tags: ["offsets", "at-least-once", "database"],
    question:
      "A consumer updates a customer read model in PostgreSQL. Compare committing an offset before the database transaction, after it, and inside a Kafka transaction. Which behavior do you choose and why?",
    scenario:
      "Read model updates are safe to repeat only if they are version-aware.",
    followUps: [
      "What happens if the database transaction succeeds but the offset commit fails?",
      "When does Kafka transaction support not solve the database atomicity gap?"
    ],
    hints: [
      "An offset says which records the group considers complete.",
      "Consider a crash at every boundary between processing, database commit, and offset commit.",
      "A database unique constraint or version check can make repeat processing converge."
    ],
    summary:
      "Commit the database effect before the offset and make the database write idempotent or version-aware; a later offset failure creates a repeat, which is safer than losing a record due to an early commit.",
    answerPoints: [
      "Committing first gives at-most-once behavior and risks skipped database work if the process dies afterward.",
      "Committing the offset after a successful database transaction gives at-least-once processing, so the database must tolerate a reprocessed event.",
      "Use a unique event id, aggregate version, or upsert predicate inside the database transaction to make repeats no-ops or deterministic updates.",
      "Kafka transactions atomically coordinate consumed offsets with records produced to Kafka, not arbitrary external database commits."
    ],
    tradeoffs: [
      "At-least-once semantics increase deduplication responsibility but avoid silent loss.",
      "Per-message transactions simplify correctness but can lower throughput compared with bounded batches."
    ],
    failureModes: [
      "Offset commit before the database commit loses an update on crash.",
      "Database success followed by commit failure causes duplicate mutation without an idempotency rule."
    ],
    keyTerms: ["offset commit", "at-least-once", "database transaction", "idempotent upsert"],
    commonPitfalls: [
      "Calling a post-database offset commit exactly-once by default.",
      "Using Kafka transactions as if they commit a relational database."
    ]
  }),
  makeModuleQuestion("kafka", references.kafka, {
    slug: "choose-retention-or-log-compaction",
    primaryTopicId: "kafka-core",
    title: "Choose retention or log compaction for customer events",
    type: "compare",
    difficulty: "intermediate",
    estimatedMinutes: 18,
    tags: ["retention", "log-compaction", "tombstones"],
    question:
      "Compare a time-retained event topic with a compacted customer-state topic. Explain what each guarantees, how tombstones work, and how a new consumer should bootstrap.",
    scenario:
      "Analytics needs the full change history for 18 months; an API projection needs only the latest customer preferences.",
    followUps: [
      "Why is compaction not an immediate removal of every older record?",
      "When would you use both compaction and time retention?"
    ],
    hints: [
      "Retention removes records based on time or size.",
      "Compaction preserves the latest value per key eventually, not a complete audit history.",
      "A null-valued record has special deletion meaning for compacted topics."
    ],
    summary:
      "Use a time-retained immutable event topic for history and a keyed compacted topic for reconstructing latest state; consumers must handle duplicate historical values and tombstones during compaction lag.",
    answerPoints: [
      "Set time or size retention on the event history topic from replay and compliance needs, with capacity calculations for replication.",
      "Key the state topic by customer id so compaction can retain the latest record per key; publish tombstones for deletions and retain them long enough for consumers to observe.",
      "Bootstrap a state projection by reading from the beginning and applying records in partition order, including tombstones, rather than assuming a compacted log is one row per key at every instant.",
      "Use both cleanup policies when consumers need a bounded replay window plus latest-key reconstruction."
    ],
    tradeoffs: [
      "History supports audit and temporal analytics but consumes more storage.",
      "Compaction lowers state reconstruction volume but makes key choice and tombstone handling essential."
    ],
    failureModes: [
      "Using compaction as the only audit log and losing meaningful intermediate changes.",
      "Deleting tombstones too soon so a lagging projection resurrects removed state."
    ],
    keyTerms: ["retention", "log compaction", "tombstone", "keyed state"],
    commonPitfalls: [
      "Saying a compacted topic contains exactly one physical record per key.",
      "Publishing state updates with null keys, which defeats per-key compaction."
    ]
  }),
  makeModuleQuestion("kafka", references.kafka, {
    slug: "resolve-kafka-partition-key-skew",
    primaryTopicId: "kafka-operations",
    title: "Resolve partition-key skew in a Kafka topic",
    type: "debug",
    difficulty: "senior",
    estimatedMinutes: 22,
    tags: ["partition-skew", "hot-keys", "throughput"],
    question:
      "One merchant produces 40% of all purchase events, and its partition has a growing lag while other consumers are idle. Diagnose the imbalance and propose options that preserve as much business ordering as possible.",
    scenario:
      "Fraud checks need ordering per merchant account, but analytics can process individual purchases independently.",
    followUps: [
      "Why does adding consumers not fix a hot partition?",
      "When can a composite key safely distribute an aggregate?"
    ],
    hints: [
      "One partition has one active consumer in a group.",
      "The partition key encodes both distribution and ordering scope.",
      "Different downstream consumers may need different topics and ordering contracts."
    ],
    summary:
      "Measure per-partition load, then preserve merchant ordering for the fraud flow while routing analytics through a finer-grained derived topic or carefully splitting the key only when the business aggregate can be independently ordered.",
    answerPoints: [
      "Verify that the lag maps to a real skewed key rather than a slow consumer, large messages, or external dependency latency.",
      "Keep merchant-keyed events for consumers that require merchant sequence and apply backpressure or dedicated capacity to that partition.",
      "Create an analytics topic keyed by purchase id or another independently processable dimension so it can parallelize without weakening fraud semantics.",
      "If splitting a merchant is valid, define sub-aggregate ordering, routing, reconciliation, and how clients observe a cross-split state."
    ],
    tradeoffs: [
      "Separate derived topics add pipelines but let each consumer choose its true ordering requirement.",
      "Splitting a key increases throughput but can make formerly atomic aggregate rules distributed."
    ],
    failureModes: [
      "Randomly salting a merchant key breaks fraud rule ordering without a reconciliation design.",
      "Autoscaling consumers leaves the hot partition unchanged and creates idle workers."
    ],
    keyTerms: ["partition skew", "ordering scope", "derived topic", "hot partition"],
    commonPitfalls: [
      "Treating all consumers' ordering requirements as identical.",
      "Changing keys in place without a migration or dual-read strategy."
    ]
  }),
  makeModuleQuestion("kafka", references.kafka, {
    slug: "triage-growing-consumer-lag",
    primaryTopicId: "kafka-operations",
    title: "Triage a rapidly growing Kafka consumer lag",
    type: "debug",
    difficulty: "intermediate",
    estimatedMinutes: 20,
    tags: ["consumer-lag", "incident-response", "backpressure"],
    question:
      "A billing consumer group's lag rises from zero to several million in 20 minutes. Describe the first investigation, immediate containment, and safe recovery plan.",
    scenario:
      "The topic has 24 partitions, processing calls a payment provider, and a deployment completed ten minutes before the alert.",
    followUps: [
      "Why is lag a symptom rather than a complete diagnosis?",
      "When is it unsafe to reset offsets to the latest position?"
    ],
    hints: [
      "Compare producer rate with consumer throughput by partition.",
      "A deployment, rebalance, downstream dependency, poison record, and skew can all look like lag.",
      "Containment should not silently discard billing work."
    ],
    summary:
      "Decompose lag by partition and consumer health, correlate it with deployments and downstream latency, restore safe processing capacity or throttle intake, and replay from committed offsets with idempotent billing protections rather than skipping records.",
    answerPoints: [
      "Check assignment, rebalance churn, poll failures, error rates, processing time, payment-provider latency, producer rate, and partition distribution before scaling blindly.",
      "Rollback or disable the recent regression if evidence supports it, and apply bounded concurrency, retry backoff, or intake throttling so recovery does not overload the payment provider.",
      "Protect billing effects with idempotency keys and durable status so replay is safe after crashes or manual recovery actions.",
      "Set alerts on lag growth rate, oldest record age, consumer availability, retry volume, and downstream saturation to make future incidents actionable earlier."
    ],
    tradeoffs: [
      "Increasing consumers helps only when unassigned partitions and downstream capacity exist.",
      "Throttling protects dependencies but extends the customer-visible delay."
    ],
    failureModes: [
      "Resetting offsets to latest silently loses billable work.",
      "Unbounded retries create a feedback loop that makes lag and provider errors worse."
    ],
    keyTerms: ["consumer lag", "per-partition throughput", "backpressure", "idempotent replay"],
    commonPitfalls: [
      "Equating aggregate lag with a need for more consumers.",
      "Manually changing offsets before preserving the incident evidence and impact scope."
    ]
  }),
  makeModuleQuestion("kafka", references.kafka, {
    slug: "evolve-event-schema-without-breaking-consumers",
    primaryTopicId: "kafka-delivery-schema",
    title: "Evolve an event schema without breaking consumers",
    type: "design",
    difficulty: "senior",
    estimatedMinutes: 24,
    tags: ["schema-evolution", "contracts", "compatibility"],
    question:
      "A UserRegistered event needs a new required marketing-consent field, but old producers and consumers run for weeks during a phased rollout. Design a safe schema evolution and deployment sequence.",
    scenario:
      "Several independently deployed services consume the event, and historical events remain replayable.",
    followUps: [
      "What is the difference between backward and forward compatibility?",
      "When should a field change require a new event type instead of a compatible evolution?"
    ],
    hints: [
      "A required field for a new consumer may not exist in historical records.",
      "An event contract includes semantics, defaults, and ownership—not only a serialization format.",
      "Deploy producers and consumers in an order that preserves compatibility at every step."
    ],
    summary:
      "Treat the change as a versioned contract: introduce an optional or defaulted field first, make consumers tolerant of absence, backfill or derive semantics where valid, then enforce new producer behavior after compatibility is proven.",
    answerPoints: [
      "Publish an explicit schema with compatibility checks in CI and include event type, schema version, ownership, and field semantics in the contract.",
      "Deploy consumers that handle both old and new payloads before producers emit the new field, and define a safe default or an Unknown state rather than inventing consent.",
      "If old records cannot be safely interpreted under the new meaning, create a new event type or versioned topic and provide a migration or dual-consumption plan.",
      "Validate with replay fixtures, contract tests, dashboards for version distribution, and a deprecation date owned by producers and consumers."
    ],
    tradeoffs: [
      "Tolerant readers make gradual rollout possible but can hide semantic ambiguity if defaults are not documented.",
      "A new event type is clearer for breaking semantic changes but creates temporary dual-pipeline cost."
    ],
    failureModes: [
      "A new consumer treats missing historical consent as affirmative consent.",
      "A producer deploys first and crashes older strict consumers."
    ],
    keyTerms: ["schema compatibility", "tolerant reader", "semantic version", "replay fixture"],
    commonPitfalls: [
      "Calling a field addition safe without considering consumers that require it on replay.",
      "Changing the meaning of an existing field under the same name."
    ]
  }),
  makeModuleQuestion("kafka", references.kafka, {
    slug: "design-transactional-outbox-to-kafka",
    primaryTopicId: "kafka-delivery-schema",
    title: "Design a transactional outbox relay to Kafka",
    type: "design",
    difficulty: "senior",
    estimatedMinutes: 28,
    tags: ["transactional-outbox", "cdc", "reliability"],
    question:
      "An order transaction commits in PostgreSQL and then an application publishes OrderCreated to Kafka. Explain the lost-event race and design an outbox or CDC solution with replay and deduplication.",
    scenario:
      "The order API must respond quickly and cannot use a distributed two-phase commit with Kafka.",
    followUps: [
      "How does a polling relay avoid double publish after a crash?",
      "What fields belong in an outbox row to support investigation and consumer safety?"
    ],
    hints: [
      "A process can crash after the database commit and before the Kafka send.",
      "An outbox row can be committed with the domain write in one database transaction.",
      "At-least-once publication is acceptable when events carry stable identity."
    ],
    summary:
      "Write domain state and an outbox row atomically in PostgreSQL, publish outbox rows through a relay or CDC connector, and make publication and consumers duplicate-tolerant using stable event ids and observable delivery status.",
    answerPoints: [
      "Include event id, aggregate id/version, event type, schema version, payload, occurred-at, and publication state in the outbox record committed with the order.",
      "A relay claims rows safely, publishes with idempotent producer settings, and marks progress only after broker acknowledgment; a crash may republish, so downstream deduplication remains necessary.",
      "CDC removes application polling but introduces connector operations, ordering, schema, and database-log retention responsibilities.",
      "Monitor outbox age, unpublished rows, relay errors, duplicate rate, and reconciliation between domain commits and observed Kafka events."
    ],
    tradeoffs: [
      "Polling outbox tables is simple to reason about but adds database load and a relay lifecycle.",
      "CDC can reduce custom code but makes log retention and connector operation product-critical."
    ],
    failureModes: [
      "Direct publish after commit loses an event on process crash.",
      "Marking an outbox row published before Kafka acknowledgment creates a permanent gap."
    ],
    keyTerms: ["transactional outbox", "cdc", "stable event id", "relay"],
    commonPitfalls: [
      "Claiming the outbox makes Kafka publication exactly-once without downstream idempotency.",
      "Deleting outbox records before proving consumers and audits no longer need them."
    ]
  }),
  makeModuleQuestion("kafka", references.kafka, {
    slug: "design-retries-and-dead-letter-topic",
    primaryTopicId: "kafka-operations",
    title: "Design retries and a dead-letter topic for Kafka consumers",
    type: "design",
    difficulty: "senior",
    estimatedMinutes: 24,
    tags: ["retries", "dead-letter-topic", "poison-messages"],
    question:
      "A payment-enrichment consumer encounters temporary provider failures and occasional malformed events. Design retry behavior, a dead-letter path, and safe replay without blocking an entire partition forever.",
    scenario:
      "Ordering matters per payment, while unrelated payments should continue when possible.",
    followUps: [
      "Why is a dead-letter topic an operational workflow rather than a garbage bin?",
      "How do retry topics affect ordering and consumer lag?"
    ],
    hints: [
      "Separate retryable dependency failures from permanent validation failures.",
      "A paused partition protects ordering but reduces throughput behind one bad record.",
      "A DLQ message needs original context and a documented owner."
    ],
    summary:
      "Classify errors, use bounded backoff and idempotent retries for transient failures, quarantine permanent failures with rich context and ownership, and choose between partition blocking or retry-topic reordering based on the exact ordering contract.",
    answerPoints: [
      "Validate schema and business preconditions early; send unrecoverable events to a dead-letter topic with original payload, headers, source topic/partition/offset, error class, attempt count, and trace id.",
      "For transient failures, use bounded exponential backoff with jitter and circuit breaking so a broken provider does not cause retry amplification.",
      "If per-payment ordering is strict, pause or sequence that key's work until resolved; if not, retry topics or scheduled retries can let later independent work proceed.",
      "Build a DLQ review, repair, replay, expiry, alerting, and audit process so teams know whether and how a message returns to the main flow."
    ],
    tradeoffs: [
      "Blocking preserves partition order but can delay unrelated keys sharing a partition.",
      "Retry topics improve throughput but complicate order and duplicate handling."
    ],
    failureModes: [
      "Infinite retries keep a poison message at the head of a partition forever.",
      "Sending malformed payment events to a DLQ with no alert or replay process silently loses business work."
    ],
    keyTerms: ["retry budget", "dead-letter topic", "backoff with jitter", "quarantine workflow"],
    commonPitfalls: [
      "Treating all exceptions as retryable.",
      "Publishing only a stack trace to a DLQ and losing the original record context."
    ]
  }),
  makeModuleQuestion("kafka", references.kafka, {
    slug: "explain-kafka-transactions-and-exactly-once",
    primaryTopicId: "kafka-delivery-schema",
    title: "Explain Kafka transactions and exactly-once semantics",
    type: "concept",
    difficulty: "senior",
    estimatedMinutes: 25,
    tags: ["transactions", "exactly-once", "read-committed"],
    question:
      "A stream processor reads orders from Kafka and writes payment-risk events back to Kafka. Explain how Kafka transactions can make the consume-transform-produce path exactly-once within Kafka, and what they do not cover.",
    scenario:
      "A downstream service uses read_committed isolation, but another service writes a database row for each risk event.",
    followUps: [
      "What happens to output records when a transaction aborts?",
      "Why can a database-writing consumer still observe an at-least-once boundary?"
    ],
    hints: [
      "Transactions can atomically publish output records and commit input offsets.",
      "Consumers must opt into isolation to hide uncommitted or aborted output.",
      "An external database is outside the Kafka transaction coordinator."
    ],
    summary:
      "Kafka transactions atomically commit produced Kafka records and consumed offsets so a read-process-write topology can avoid duplicate visible outputs to read_committed consumers, but external effects still need idempotency or an outbox boundary.",
    answerPoints: [
      "Use a transactional producer with a stable transactional id, begin a transaction, produce derived records, send consumed offsets to the transaction, and commit or abort together.",
      "Configure downstream Kafka consumers with read_committed when they must not see aborted or uncommitted records.",
      "Understand fencing and transactional-id ownership so a stale processor instance cannot continue producing after replacement.",
      "For a database side effect, keep a unique event id or transactional outbox because Kafka cannot atomically commit the database write."
    ],
    tradeoffs: [
      "Transactions improve intra-Kafka correctness but add latency, state, and operational constraints.",
      "Idempotent external writes are simpler across boundaries but may require dedup storage."
    ],
    failureModes: [
      "A downstream consumer uses read_uncommitted and observes output that later aborts.",
      "Two processor instances share a transactional id incorrectly and fence each other unpredictably."
    ],
    keyTerms: ["transactional id", "read committed", "offset transaction", "producer fencing"],
    commonPitfalls: [
      "Saying exactly-once covers payment-provider calls or database writes by default.",
      "Forgetting to include offsets in the Kafka transaction."
    ]
  }),
  makeModuleQuestion("kafka", references.kafka, {
    slug: "design-kafka-streams-state-store",
    primaryTopicId: "kafka-delivery-schema",
    title: "Design a stateful Kafka Streams aggregation",
    type: "design",
    difficulty: "senior",
    estimatedMinutes: 25,
    tags: ["kafka-streams", "state-store", "changelog"],
    question:
      "Design a real-time per-merchant sales total using a stateful stream processor. Explain repartitioning, local state, changelog recovery, and how you would expose the result to an API.",
    scenario:
      "Events can arrive late, a processor instance can be replaced, and clients only need totals within a one-minute freshness window.",
    followUps: [
      "Why might a groupBy operation create an internal repartition topic?",
      "What data is needed to restore state after a processor crash?"
    ],
    hints: [
      "Stateful operations need records with the same aggregate key co-located.",
      "Local RocksDB-like state is backed by a changelog topic for recovery.",
      "Serving state is a separate API and consistency design decision."
    ],
    summary:
      "Key the aggregation by merchant, allow the stream framework to repartition when needed, maintain local state backed by a changelog, and expose a materialized projection with a documented freshness and recovery profile.",
    answerPoints: [
      "Choose the merchant key before aggregation so all contributions for one total reach one task; inspect and manage any repartition topic capacity and retention.",
      "Use a state store and changelog so a replacement instance can restore local state from Kafka rather than requiring a full external database rebuild.",
      "Define windowing, late-event policy, deduplication, and correction semantics so totals have meaningful business behavior.",
      "Serve the materialized state through interactive queries or sink it to a read store, with health checks for restore lag and freshness."
    ],
    tradeoffs: [
      "Local state gives low-latency aggregation but requires disk, restoration, and rebalancing management.",
      "An external read store is easy for APIs but adds a second projection and delivery boundary."
    ],
    failureModes: [
      "A changed key causes an unnoticed repartition hotspot or wrong aggregate.",
      "An API reads a restoring store and reports a total without a freshness signal."
    ],
    keyTerms: ["state store", "changelog topic", "repartition", "materialized view"],
    commonPitfalls: [
      "Treating local stream state as durable without understanding the changelog.",
      "Ignoring late and duplicate events in a financial aggregation."
    ]
  }),
  makeModuleQuestion("kafka", references.kafka, {
    slug: "size-kafka-brokers-for-throughput-and-retention",
    primaryTopicId: "kafka-operations",
    title: "Size Kafka brokers for throughput, replication, and retention",
    type: "calculation",
    difficulty: "senior",
    estimatedMinutes: 28,
    tags: ["capacity-planning", "retention", "brokers"],
    question:
      "A platform expects 50 MB/s of inbound events, three-day retention, replication factor three, and 30% headroom. Walk through a sizing estimate and name the non-storage constraints that could change the broker count.",
    scenario:
      "Peak traffic is double the average for two hours each day, and consumers frequently replay one day of data for recovery.",
    followUps: [
      "How does replication affect disk and network planning?",
      "Why is partition count relevant even if raw disk capacity fits?"
    ],
    hints: [
      "State assumptions and use peak rather than only average for safety margins.",
      "Replication multiplies stored bytes and replication traffic.",
      "Disk is only one resource: network, CPU, partitions, recovery time, and client load matter."
    ],
    summary:
      "Estimate retained logical bytes from peak ingress and retention, multiply for replication and headroom, then choose enough brokers for usable disk plus network, CPU, partition, failure-recovery, and replay capacity rather than dividing storage alone.",
    answerPoints: [
      "Calculate a transparent baseline: ingress rate times retention seconds, adjusted for peak pattern, compression assumption, replication factor, and reserved free space.",
      "Ensure each broker can absorb a peer's replica load and traffic during a failure without crossing disk or network safety limits.",
      "Plan partitions from throughput and consumer parallelism while avoiding a count that makes controller, file-handle, and recovery overhead excessive.",
      "Test replay and re-replication rates because a cluster that stores data safely but restores too slowly misses the actual recovery objective."
    ],
    tradeoffs: [
      "Higher retention supports replay and audit but increases storage, recovery, and compaction cost.",
      "More headroom costs capacity but prevents a normal broker failure from becoming a cascading incident."
    ],
    failureModes: [
      "Sizing average throughput only and exhausting disk or network during peaks.",
      "Ignoring replication catch-up, so one broker failure overloads surviving brokers."
    ],
    keyTerms: ["retention bytes", "replication factor", "failure headroom", "re-replication"],
    commonPitfalls: [
      "Giving a broker count without recording compression, peak, and usable-disk assumptions.",
      "Assuming a cluster with free disk automatically has enough replay throughput."
    ]
  }),
  makeModuleQuestion("kafka", references.kafka, {
    slug: "recover-from-under-replicated-partitions",
    primaryTopicId: "kafka-operations",
    title: "Recover safely from under-replicated Kafka partitions",
    type: "debug",
    difficulty: "senior",
    estimatedMinutes: 24,
    tags: ["under-replicated-partitions", "broker-recovery", "incident"],
    question:
      "After a broker replacement, under-replicated partitions climb and produce latency rises. Explain the investigation, traffic safety controls, and recovery sequence without making durability claims you cannot keep.",
    scenario:
      "One availability zone has degraded network throughput and several partitions are leadership-heavy on that zone.",
    followUps: [
      "When might throttling replica movement be safer than maximizing catch-up speed?",
      "How would you communicate increased loss or write-unavailability risk to application owners?"
    ],
    hints: [
      "Under-replication can be caused by network, disk, broker health, leader imbalance, or capacity saturation.",
      "Aggressive recovery competes with client traffic.",
      "Durability settings may intentionally reject writes while ISR is below the threshold."
    ],
    summary:
      "Identify the constrained resource and affected failure domain, stabilize client traffic, rebalance leadership and replicas with controlled throttles, and keep application owners informed of the current acknowledged-write safety posture.",
    answerPoints: [
      "Inspect broker disk, network, CPU, request queues, controller events, replica fetch lag, leader distribution, and zone health to distinguish root causes.",
      "Use controlled partition reassignment or replica recovery throttles so catch-up does not starve normal produce and fetch traffic.",
      "Preserve min.insync.replicas behavior for critical topics; if writes fail, make that explicit rather than weakening safety invisibly during an incident.",
      "Verify ISR recovery, leader balance, produce latency, and error rates before declaring resolution, then record capacity and placement improvements."
    ],
    tradeoffs: [
      "Fast catch-up reduces exposure time but can saturate the remaining healthy brokers.",
      "Throttling protects users but leaves partitions under-replicated longer."
    ],
    failureModes: [
      "Forcing unsafe leader elections to restore availability creates unbounded data-loss risk.",
      "Reassigning all partitions at once overwhelms the degraded network zone."
    ],
    keyTerms: ["under-replicated partition", "replica lag", "leadership balance", "recovery throttle"],
    commonPitfalls: [
      "Treating every URP alert as a need to restart brokers.",
      "Lowering min.insync.replicas without an explicit business risk decision."
    ]
  }),
  makeModuleQuestion("kafka", references.kafka, {
    slug: "design-multi-region-kafka-replication",
    primaryTopicId: "kafka-operations",
    title: "Design multi-region Kafka replication for disaster recovery",
    type: "design",
    difficulty: "senior",
    estimatedMinutes: 30,
    tags: ["multi-region", "disaster-recovery", "replication"],
    question:
      "A company needs regional Kafka clusters with a one-hour recovery objective for order events. Compare active-passive and active-active approaches, including replication lag, failover, duplicate events, and client routing.",
    scenario:
      "Orders are written in one home region today, but users may read projections globally.",
    followUps: [
      "How do you prevent replication loops in an active-active topology?",
      "What happens to consumer offsets when failing over to a replicated cluster?"
    ],
    hints: [
      "Cross-region replication is usually asynchronous and changes RPO.",
      "Events need origin and stable identity for deduplication and loop prevention.",
      "Data replication, producer routing, and consumer group recovery are separate plans."
    ],
    summary:
      "Start with an active-passive home-region write model when possible, replicate asynchronously with measured lag, and define failover, duplicate, offset, and reconciliation procedures; use active-active only with explicit ownership and conflict rules.",
    answerPoints: [
      "Set RPO from measured worst-case replication lag and keep an independent source or outbox for business events that cannot be lost before replication.",
      "Tag events with immutable event id and origin region; configure replication to avoid re-mirroring mirrored records and make consumers deduplicate during failover.",
      "Run a tested failover sequence for DNS/routing, producer fencing or home-region switch, consumer offset translation or replay, and downstream reconciliation.",
      "Use active-active only if aggregates have clear regional ownership or conflict resolution; otherwise simultaneous writes create business ambiguity, not just replication complexity."
    ],
    tradeoffs: [
      "Active-passive is easier to reason about but can have regional write downtime and nonzero RPO.",
      "Active-active improves locality but requires conflict semantics and stronger operational discipline."
    ],
    failureModes: [
      "Failing over consumers using offsets that do not correspond to the replicated topic's history.",
      "Writing the same aggregate in both regions without a conflict owner."
    ],
    keyTerms: ["asynchronous replication", "rpo", "origin region", "offset translation"],
    commonPitfalls: [
      "Describing cross-region replication as synchronous disaster-proofing.",
      "Ignoring how producer and consumer clients change regions during failover."
    ]
  }),
  makeModuleQuestion("kafka", references.kafka, {
    slug: "secure-kafka-with-authentication-and-acls",
    primaryTopicId: "kafka-operations",
    title: "Secure Kafka with authentication, ACLs, and encryption",
    type: "design",
    difficulty: "intermediate",
    estimatedMinutes: 20,
    tags: ["security", "acls", "authentication"],
    question:
      "Design access control for Kafka so the order service can publish to orders, the billing service can consume orders and publish billing events, and developers cannot read production payment data by default.",
    scenario:
      "The cluster runs in a shared platform and supports both production and non-production environments.",
    followUps: [
      "Why should consumer group permissions be controlled separately from topic read permissions?",
      "How would you rotate a compromised service credential without a broad outage?"
    ],
    hints: [
      "Authentication identifies a principal; authorization grants exact operations on resources.",
      "A consumer group offset is shared state that can be disrupted by another principal.",
      "Encryption in transit and audit logs complement access policies."
    ],
    summary:
      "Authenticate every client with a workload identity, grant least-privilege ACLs for topic and consumer-group operations, encrypt traffic, separate environments, and make credential rotation and audit evidence routine operations.",
    answerPoints: [
      "Grant the order service write access only to intended topics, billing read access to order topics plus its named consumer group, and write access only to billing-owned topics.",
      "Control group operations separately so an unauthorized client cannot join, reset, or commit offsets for a production billing group.",
      "Use TLS for transport, protect client credentials in a secret system, rotate with overlapping valid identities where possible, and audit authorization failures and changes.",
      "Segment production from non-production clusters or namespaces so test clients cannot access production topics by configuration accident."
    ],
    tradeoffs: [
      "Fine-grained ACLs improve blast-radius control but require automation and ownership upkeep.",
      "Shared broad credentials simplify onboarding but make incident attribution and revocation weak."
    ],
    failureModes: [
      "A developer's read permission exposes payment data through a broad topic wildcard.",
      "An unauthorized client advances a consumer group offset and skips billing work."
    ],
    keyTerms: ["workload identity", "least privilege", "consumer group acl", "tls"],
    commonPitfalls: [
      "Granting topic read access without considering group offset ownership.",
      "Treating network location as sufficient authentication."
    ]
  }),
  makeModuleQuestion("kafka", references.kafka, {
    slug: "design-event-contract-for-order-lifecycle",
    primaryTopicId: "kafka-delivery-schema",
    title: "Design an event contract for an order lifecycle",
    type: "design",
    difficulty: "intermediate",
    estimatedMinutes: 22,
    tags: ["event-design", "contracts", "order-lifecycle"],
    question:
      "Design the payload and semantics for an OrderCancelled event used by inventory, billing, analytics, and support tools. Explain identifiers, versions, timestamps, privacy, and what not to include.",
    scenario:
      "The event may be replayed years later and consumed by services owned by different teams.",
    followUps: [
      "Which timestamp should represent the business event versus the producer emission?",
      "How do you avoid turning an event into a leaked copy of an internal database row?"
    ],
    hints: [
      "An event should state a fact and its contract, not simply serialize a table.",
      "Stable identities allow deduplication, traceability, and versioning.",
      "Data minimization matters because events are retained and broadly consumed."
    ],
    summary:
      "Publish an immutable, versioned domain fact with stable event and aggregate ids, causation/correlation metadata, clear timestamps and reason semantics, and only the minimized fields consumers are permitted to retain.",
    answerPoints: [
      "Include event id, order id, aggregate version, event type/schema version, occurred-at, emitted-at, correlation id, causation id, cancellation reason, and actor category where authorized.",
      "Describe ordering and delivery semantics in the contract so consumers know whether to rely on per-order version or perform reconciliation.",
      "Avoid raw payment tokens, unnecessary PII, mutable internal implementation fields, and ambiguous boolean flags that are impossible to interpret on replay.",
      "Assign an owning team, compatibility policy, examples, contract tests, and a deprecation path rather than treating the topic name as the whole API."
    ],
    tradeoffs: [
      "Richer events reduce consumer calls but increase privacy and schema-evolution surface.",
      "Minimal events preserve encapsulation but may require consumers to maintain their own projections."
    ],
    failureModes: [
      "A consumer infers cancellation state from a mutable order row that no longer reflects the historical fact.",
      "PII copied into a long-retained topic becomes difficult to delete or restrict later."
    ],
    keyTerms: ["event id", "aggregate version", "causation id", "data minimization"],
    commonPitfalls: [
      "Publishing a database dump as an event contract.",
      "Omitting an event version because the topic is considered internal."
    ]
  }),
  makeModuleQuestion("kafka", references.kafka, {
    slug: "replay-kafka-events-with-external-side-effects",
    primaryTopicId: "kafka-operations",
    title: "Replay Kafka events with external side effects safely",
    type: "design",
    difficulty: "senior",
    estimatedMinutes: 26,
    tags: ["replay", "idempotency", "side-effects"],
    question:
      "A team needs to replay six months of OrderPaid events to rebuild a reporting system, but the existing consumer also sends receipts. Design a replay strategy that cannot email customers again or mutate production order state.",
    scenario:
      "The topic is retained long enough for the replay, and reporting needs an isolated validation period before cutover.",
    followUps: [
      "When would you use a new consumer group versus copying to a new topic?",
      "How do you verify replay completeness before replacing the old report?"
    ],
    hints: [
      "Consumer group offsets define a reader's position, not a safe business mode.",
      "A replay consumer should have an explicitly scoped sink and credentials.",
      "Counts alone are insufficient if updates and deletes are possible."
    ],
    summary:
      "Run an isolated consumer group against a replay-safe projection sink with no receipt or order-write permissions, make all output idempotent by event identity, validate reconciled results, then cut over through a controlled versioned boundary.",
    answerPoints: [
      "Use a dedicated consumer group and separate credentials, feature flags, or deployment target so the replay code cannot call the receipt provider or production mutation APIs.",
      "Write to a new reporting table or topic keyed by stable event id and aggregate version, allowing repeats and restart without corrupting the rebuilt projection.",
      "Reconcile record counts, key coverage, aggregate totals, error/DLQ records, and sample event lineage against the source before declaring the replay complete.",
      "Plan cutover for the gap between replay start and current events, for example by catching up the new projection before switching reads."
    ],
    tradeoffs: [
      "A new consumer group is fast to start but needs strict output isolation.",
      "Copying into a dedicated replay topic provides isolation but costs time and storage."
    ],
    failureModes: [
      "Using the production receipt consumer group for replay sends old customer emails again.",
      "Comparing only total message counts misses duplicate or missing per-order effects."
    ],
    keyTerms: ["isolated consumer group", "replay-safe sink", "event identity", "cutover catch-up"],
    commonPitfalls: [
      "Treating a change in offsets as an authorization boundary.",
      "Replaying into the existing projection table without an idempotency or comparison plan."
    ]
  }),
  makeModuleQuestion("kafka", references.kafka, {
    slug: "design-kafka-compacted-cache-invalidator",
    primaryTopicId: "kafka-core",
    title: "Design a compacted Kafka topic for cache invalidation state",
    type: "design",
    difficulty: "intermediate",
    estimatedMinutes: 20,
    tags: ["compaction", "cache-invalidation", "projections"],
    question:
      "A fleet of API nodes needs a durable signal of the latest cache invalidation version for each product. Design a compacted Kafka topic and consumer behavior that works after a node restart.",
    scenario:
      "Product update events can arrive rapidly, but each node only needs to know the greatest committed version per product.",
    followUps: [
      "Why should consumers compare versions even though Kafka preserves partition order?",
      "How would a tombstone be used when a product is deleted?"
    ],
    hints: [
      "A compacted topic preserves the latest value per key eventually.",
      "Key records by product id and carry an explicit version.",
      "Restarting consumers should reconstruct state from the beginning safely."
    ],
    summary:
      "Use a product-id-keyed compacted topic whose value carries an invalidation or aggregate version, rebuild each node's local map from the log, and invalidate cached values only when their version is older than the observed version.",
    answerPoints: [
      "Publish product id as the key and a monotonically increasing version with the invalidation reason so compaction retains a usable latest state.",
      "On startup, consume from earliest to materialize the highest version map before marking the node ready for cache-serving traffic.",
      "On update, delete or reject cache entries whose stored version is behind the observed invalidation version; a later late cache fill cannot revive stale content.",
      "Publish a tombstone for product deletion and keep delete semantics documented for all caches and projections."
    ],
    tradeoffs: [
      "A compacted topic gives durable restart state but adds consumer lifecycle and readiness complexity.",
      "Direct best-effort invalidation is lower latency but misses events during node downtime."
    ],
    failureModes: [
      "A restarted node serves cache before reconstructing its invalidation map.",
      "A value without a version lets an old asynchronous fill reintroduce stale content."
    ],
    keyTerms: ["compacted topic", "monotonic version", "materialized map", "tombstone"],
    commonPitfalls: [
      "Using a null Kafka key for an invalidation that needs compaction by product.",
      "Assuming compaction instantly removes all old versions from the log."
    ]
  }),
  makeModuleQuestion("kafka", references.kafka, {
    slug: "handle-poison-pill-with-schema-validation",
    primaryTopicId: "kafka-operations",
    title: "Handle a poison-pill Kafka record safely",
    type: "debug",
    difficulty: "intermediate",
    estimatedMinutes: 18,
    tags: ["poison-pill", "validation", "dead-letter-topic"],
    question:
      "A consumer repeatedly crashes on one malformed record at a particular offset, so the partition never progresses. Explain containment, diagnosis, schema hardening, and how to preserve evidence for repair.",
    scenario:
      "The malformed event was produced by an older service version during a partial rollout.",
    followUps: [
      "When is it acceptable to skip a record, and how should that decision be recorded?",
      "How can contract testing prevent recurrence?"
    ],
    hints: [
      "One bad record can block all later records in a partition when processing is sequential.",
      "Do not discard the original payload and metadata during containment.",
      "A schema check should happen before business logic has side effects."
    ],
    summary:
      "Validate and classify records before side effects, quarantine a permanent poison record with its source metadata through a controlled dead-letter workflow, advance only with auditable approval, and add producer/consumer contract tests to prevent repeat incidents.",
    answerPoints: [
      "Capture topic, partition, offset, headers, raw payload, producer version, validation error, and trace correlation in a quarantined record or incident artifact.",
      "Distinguish a permanent contract violation from a transient dependency failure; retrying malformed input indefinitely only blocks the partition.",
      "If skipping is authorized, emit an auditable DLQ record and commit past it through a controlled tool or code path that makes the business impact visible.",
      "Add schema registry or contract fixtures, compatibility checks, rollout sequencing, and alerts on validation failure rate."
    ],
    tradeoffs: [
      "Fail-fast validation protects downstream state but requires an explicit repair process.",
      "Skipping restores throughput but can lose a business operation unless compensated."
    ],
    failureModes: [
      "An automated retry loop crashes on the same bad offset forever.",
      "A manual offset jump removes the only evidence needed to reconstruct the event."
    ],
    keyTerms: ["poison pill", "source offset", "quarantine", "contract test"],
    commonPitfalls: [
      "Calling every exception a retry rather than validating input class.",
      "Putting only parsed fields in the DLQ and losing the original payload."
    ]
  }),
  makeModuleQuestion("kafka", references.kafka, {
    slug: "migrate-kafka-topic-with-new-partition-key",
    primaryTopicId: "kafka-operations",
    title: "Migrate a Kafka topic to a new partition key",
    type: "design",
    difficulty: "senior",
    estimatedMinutes: 26,
    tags: ["migration", "partition-key", "dual-write"],
    question:
      "A legacy topic is keyed by customer id, but a new workflow requires per-subscription ordering and better distribution. Design a migration without abruptly breaking existing consumers or losing replayability.",
    scenario:
      "Old and new consumers must coexist for a month, and some customer events have no subscription yet.",
    followUps: [
      "Why is simply increasing partitions not a semantic migration for an existing key?",
      "How would you validate that the new topic carries a complete equivalent event stream?"
    ],
    hints: [
      "Changing the key changes ordering scope and partition routing.",
      "A parallel topic gives consumers an explicit contract boundary.",
      "Dual publication needs a durable source to avoid mismatched copies."
    ],
    summary:
      "Create a versioned topic with the new key and contract, derive or dual-publish it from an authoritative outbox or source log, run consumers in parallel with reconciliation, then deprecate the legacy topic after a defined replay window.",
    answerPoints: [
      "Document the old and new ordering guarantees, including how events without a subscription key are routed or represented.",
      "Use an outbox relay, CDC, or a single transformation pipeline from the authoritative event source so dual publication has traceable event identities and avoids split-brain writes.",
      "Validate per-event coverage, aggregate versions, partition distribution, consumer results, lag, and error rates before shifting production reads.",
      "Retain the old topic through the agreed rollback and replay period; publish deprecation dates and owner responsibilities for every consumer."
    ],
    tradeoffs: [
      "Parallel topics preserve compatibility but cost duplicate storage and processing temporarily.",
      "In-place key changes are faster operationally but obscure semantic breakage and are hard to roll back."
    ],
    failureModes: [
      "A new key omits an event class and creates a silent incomplete projection.",
      "Clients consume both topics without deduplication and double-apply events."
    ],
    keyTerms: ["versioned topic", "partition key", "dual publication", "reconciliation"],
    commonPitfalls: [
      "Assuming adding partitions changes a historical record's routing or ordering contract.",
      "Deleting the legacy topic before consumers have migrated and replay needs expire."
    ]
  }),
  makeModuleQuestion("kafka", references.kafka, {
    slug: "design-kafka-backpressure-for-slow-consumer",
    primaryTopicId: "kafka-operations",
    title: "Design backpressure for a slow Kafka consumer dependency",
    type: "design",
    difficulty: "intermediate",
    estimatedMinutes: 20,
    tags: ["backpressure", "consumer-lag", "circuit-breaker"],
    question:
      "A document-indexing consumer calls a search cluster that becomes slow during shard relocation. Design consumer behavior so Kafka lag is visible and recoverable without overwhelming the search cluster or triggering group instability.",
    scenario:
      "The topic is retained for seven days and the product can delay search visibility for several minutes.",
    followUps: [
      "How do pause/resume and bounded worker queues help?",
      "What alert distinguishes an acceptable planned slowdown from an approaching retention breach?"
    ],
    hints: [
      "Kafka can buffer work, but retained capacity is finite.",
      "A consumer should apply an explicit concurrency limit to its dependency.",
      "Stopping polls entirely can trigger a rebalance if not designed carefully."
    ],
    summary:
      "Use bounded processing concurrency, pause/resume assigned partitions while keeping the consumer lifecycle healthy, apply dependency timeouts and circuit breaking, and alert on oldest-record age relative to retention and recovery capacity.",
    answerPoints: [
      "Measure search latency and errors, consumer queue depth, per-partition lag, oldest unprocessed event age, and expected catch-up rate before changing scale.",
      "Limit in-flight indexing requests, pause partitions when queues are full, and resume only as capacity returns so the search cluster can stabilize.",
      "Use retries with backoff and a circuit breaker for transient search failures, preserving idempotency by document/event version.",
      "Calculate time-to-retention and catch-up throughput to escalate before buffered events are at risk of expiring."
    ],
    tradeoffs: [
      "Backpressure preserves dependency health but makes data freshness visibly worse.",
      "Adding more consumers helps only if the downstream cluster and partition distribution can support more concurrency."
    ],
    failureModes: [
      "Unbounded async tasks cause memory exhaustion and a rebalance loop.",
      "Lag exceeds retention and the consumer cannot reconstruct lost indexing events."
    ],
    keyTerms: ["bounded concurrency", "pause resume", "circuit breaker", "oldest lag age"],
    commonPitfalls: [
      "Treating Kafka as infinite durable storage during a downstream outage.",
      "Stopping all polls and accidentally causing repeated consumer rebalances."
    ]
  })
];

const foundationsQuestions: InterviewQuestion[] = [
  makeModuleQuestion("foundations", references.foundations, {
    slug: "turn-product-brief-into-capacity-estimate",
    primaryTopicId: "requirements-capacity",
    title: "Turn a product brief into a capacity estimate",
    type: "calculation",
    difficulty: "foundation",
    estimatedMinutes: 18,
    tags: ["capacity-planning", "requirements", "estimation"],
    question:
      "A URL-shortening product expects 20 million new links per month and 500 million redirects per day. Show how you turn this into initial QPS, storage, bandwidth, and latency assumptions before selecting components.",
    followUps: [
      "Which assumption would you validate first with product and traffic data?",
      "How would a 10x read spike change the first likely bottleneck?"
    ],
    hints: [
      "Convert daily or monthly volume to average and peak rates, then write down the multiplier.",
      "Separate writes, reads, stored metadata, redirect payload size, and growth horizon.",
      "The goal is a defensible order of magnitude, not false precision."
    ],
    summary:
      "State traffic and payload assumptions, calculate average and peak read/write rates separately, estimate retained bytes with replication overhead, then use the largest constraints to guide the first architecture choice.",
    answerPoints: [
      "Convert the redirect volume to average QPS and choose an explicit peak multiplier from product behavior such as campaigns or time zones.",
      "Estimate link metadata bytes times monthly writes times retention, then add indexes, replicas, backups, and future growth.",
      "Allocate a latency budget across edge, application, cache, database, and network hops so the design has a measurable target.",
      "Name unknowns such as geographic distribution, abuse risk, expiration, and analytics that could materially change the design."
    ],
    tradeoffs: [
      "Early estimates accelerate design but need review as real traffic data arrives.",
      "Planning only average load underestimates user-visible peak failure modes."
    ],
    failureModes: [
      "A cache or database is sized for requests but not retained data or replication.",
      "A design optimizes one number without recording the product assumption behind it."
    ],
    keyTerms: ["peak qps", "storage estimate", "latency budget", "assumption"],
    commonPitfalls: [
      "Presenting a capacity number with no traffic or payload assumptions.",
      "Treating every requirement as equally important before identifying the dominant constraint."
    ]
  }),
  makeModuleQuestion("foundations", references.foundations, {
    slug: "trace-request-through-edge-and-origin",
    primaryTopicId: "networking-protocols",
    title: "Trace a request through edge, gateway, and origin",
    type: "concept",
    difficulty: "foundation",
    estimatedMinutes: 15,
    tags: ["networking", "latency", "http"],
    question:
      "Trace a mobile GET request through DNS, CDN, load balancer, API gateway, service, cache, and database. Identify where latency, failure, authentication, and caching decisions belong.",
    followUps: [
      "Why should a timeout budget be propagated instead of reset at every hop?",
      "Which response can be cached at the edge and which cannot?"
    ],
    hints: [
      "A request path is a sequence of independent failure and queueing points.",
      "User identity, cacheability, and regional routing affect whether a shared edge can respond.",
      "Each downstream call consumes part of one user-visible deadline."
    ],
    summary:
      "Map each hop's responsibility and latency budget, authenticate at an appropriate boundary, cache only responses whose variation and privacy rules permit it, and propagate cancellation/deadlines so one slow dependency cannot outlive the request.",
    answerPoints: [
      "DNS and edge routing choose a reachable endpoint; the gateway can enforce coarse authentication, limits, and request normalization before application work.",
      "The service owns business authorization and response composition, while cache/database calls must have explicit deadlines and fallbacks.",
      "Use cache-control and cache keys that include every varying dimension; never put private responses in a shared cache without correct controls.",
      "Trace request ids and timing across hops so latency attribution is based on evidence."
    ],
    tradeoffs: [
      "More edge behavior lowers origin latency but increases cache-invalidation and security complexity.",
      "Central gateways simplify common controls but should not become the only business authorization layer."
    ],
    failureModes: [
      "Each hop applies a full timeout, multiplying the user-visible deadline.",
      "A shared cache serves one user's private response to another user."
    ],
    keyTerms: ["deadline propagation", "cache key", "trust boundary", "request trace"],
    commonPitfalls: [
      "Drawing a request diagram without describing what each hop does on failure.",
      "Treating authentication at the edge as a replacement for resource authorization."
    ]
  }),
  makeModuleQuestion("foundations", references.foundations, {
    slug: "choose-polling-webhooks-or-streaming",
    primaryTopicId: "networking-protocols",
    title: "Choose polling, webhooks, or streaming for live status",
    type: "compare",
    difficulty: "intermediate",
    estimatedMinutes: 16,
    tags: ["polling", "webhooks", "streaming"],
    question:
      "A build platform wants clients to see job-status changes quickly. Compare polling, webhooks, server-sent events, and WebSockets, including delivery, reconnection, and infrastructure implications.",
    followUps: [
      "How should a client recover status after reconnecting?",
      "Why should the authoritative status API exist even when push is used?"
    ],
    hints: [
      "Different consumers may be browsers, third-party servers, or mobile clients.",
      "Push delivery can be missed, duplicated, or delayed.",
      "Status correctness needs a source of truth independent of notification transport."
    ],
    summary:
      "Use polling for simple bounded freshness, webhooks for server-to-server notifications with signed retries, and streaming for interactive clients; always keep a durable status read endpoint for reconnect and reconciliation.",
    answerPoints: [
      "Polling is simple and cacheable but trades freshness for repeated load; use backoff, ETags, and a cadence tied to user value.",
      "Webhooks need signing, idempotency, retry policy, endpoint verification, and a way for receivers to fetch canonical state.",
      "SSE or WebSockets reduce interactive latency but need connection scaling, auth renewal, heartbeats, and reconnect cursor semantics.",
      "Include event ids or state versions so clients can discard duplicates and recover gaps through the status API."
    ],
    tradeoffs: [
      "Persistent streams reduce polling load but increase connection-management cost.",
      "Webhooks decouple clients but make third-party delivery observability important."
    ],
    failureModes: [
      "A client treats a missed push event as proof that job state did not change.",
      "A webhook receiver processes retries as new job completions."
    ],
    keyTerms: ["reconnect cursor", "idempotent webhook", "authoritative status", "heartbeat"],
    commonPitfalls: [
      "Choosing WebSockets because they sound real-time without a connection or recovery plan.",
      "Using notifications as the only source of job state."
    ]
  }),
  makeModuleQuestion("foundations", references.foundations, {
    slug: "design-backpressure-at-api-boundary",
    primaryTopicId: "requirements-capacity",
    title: "Design backpressure at an API boundary",
    type: "design",
    difficulty: "intermediate",
    estimatedMinutes: 20,
    tags: ["backpressure", "rate-limiting", "load-shedding"],
    question:
      "A bursty image-upload API can enqueue work faster than workers can process it. Design admission control, queue limits, user feedback, and metrics that prevent a slow collapse.",
    followUps: [
      "Which requests should receive a retryable response versus be accepted asynchronously?",
      "How do you protect one tenant from consuming all queue capacity?"
    ],
    hints: [
      "Queues buffer variability but need finite limits and a recovery model.",
      "Backpressure should be visible to clients and operators.",
      "Bound concurrency at every scarce downstream dependency."
    ],
    summary:
      "Set explicit per-tenant and global admission limits, accept work only when durable queue capacity exists, expose queued status or retry guidance, and alert on age and drain rate rather than waiting for resource exhaustion.",
    answerPoints: [
      "Apply authentication-aware rate limits and quotas before expensive upload processing, with clear 429 or 503 behavior and retry-after guidance where appropriate.",
      "Make the queue durable enough for accepted work, cap its length or age, and use bounded worker concurrency with downstream timeouts.",
      "Separate interactive requests from bulk workloads so a batch cannot starve customer-facing traffic.",
      "Track accepted/rejected work, queue depth, oldest age, drain rate, per-tenant share, and time-to-overflow."
    ],
    tradeoffs: [
      "Early rejection protects the system but can degrade user experience during spikes.",
      "Larger queues absorb bursts but increase recovery time and stale-work risk."
    ],
    failureModes: [
      "An unbounded queue turns a short burst into a memory or storage outage.",
      "Retrying clients amplify load because responses give no backoff guidance."
    ],
    keyTerms: ["admission control", "bounded queue", "load shedding", "drain rate"],
    commonPitfalls: [
      "Calling a queue a backpressure strategy without naming its capacity or rejection behavior.",
      "Scaling workers before checking the downstream bottleneck."
    ]
  })
];

const apiQuestions: InterviewQuestion[] = [
  makeModuleQuestion("api-auth", references.api, {
    slug: "design-idempotent-create-payment-api",
    primaryTopicId: "api-design",
    title: "Design an idempotent create-payment API",
    type: "design",
    difficulty: "senior",
    estimatedMinutes: 25,
    tags: ["idempotency", "payments", "api-design"],
    question:
      "Design POST /payments so a client retry after a timeout cannot charge a card twice. Include request identity, concurrent retries, response replay, and expiry behavior.",
    followUps: [
      "What should happen if the same idempotency key is reused with a different payload?",
      "Which response should a retry receive while the first request is still running?"
    ],
    hints: [
      "The client needs a stable key generated once per intended payment.",
      "Store enough request fingerprint and outcome data to detect incompatible reuse.",
      "The payment provider call and your database are separate failure boundaries."
    ],
    summary:
      "Require a client-generated idempotency key, atomically reserve it with a payload fingerprint and payment state, return the same completed result for legitimate retries, and bridge provider side effects with durable provider references or an outbox.",
    answerPoints: [
      "Scope the key to customer and operation, persist its request hash, status, response, and expiration under a uniqueness constraint before issuing the charge.",
      "If a concurrent request uses the same key and same payload, return the stored result or an in-progress response; reject a mismatched payload deterministically.",
      "Use a stable provider idempotency key and reconcile uncertain provider timeouts before deciding a charge failed or issuing another one.",
      "Retain idempotency records for at least the maximum retry and reconciliation window, with privacy-aware response storage."
    ],
    tradeoffs: [
      "Longer key retention protects delayed retries but increases storage and privacy obligations.",
      "Synchronous in-progress waiting simplifies clients but can tie up request capacity."
    ],
    failureModes: [
      "Two concurrent retries both pass a non-atomic existence check and charge twice.",
      "A timeout is treated as a failed charge without reconciling the provider outcome."
    ],
    keyTerms: ["idempotency key", "request fingerprint", "unique constraint", "provider reconciliation"],
    commonPitfalls: [
      "Using a random key per HTTP retry rather than per intended payment.",
      "Returning a cached success for a different request body with the same key."
    ]
  }),
  makeModuleQuestion("api-auth", references.api, {
    slug: "version-public-api-without-breaking-clients",
    primaryTopicId: "api-design",
    title: "Version a public API without breaking clients",
    type: "compare",
    difficulty: "intermediate",
    estimatedMinutes: 18,
    tags: ["api-versioning", "compatibility", "deprecation"],
    question:
      "A public API response needs to rename a field and change its unit. Explain compatible change rules, URL/header/media-type versioning options, and a deprecation plan.",
    followUps: [
      "Why is changing a field's semantics more dangerous than adding a field?",
      "How do you discover clients that will be affected before removal?"
    ],
    hints: [
      "Clients may be strict about unknown fields or rely on undocumented behavior.",
      "The same field name should not silently mean something new.",
      "A version is a contract and rollout lifecycle, not only a route prefix."
    ],
    summary:
      "Prefer additive, well-documented evolution; introduce a new field with explicit units and a migration window, observe client adoption, and use a new version only when compatibility cannot be preserved safely.",
    answerPoints: [
      "Classify additions, removals, nullability, enum expansion, and semantic changes against the supported client contract.",
      "Publish both old and new fields temporarily when safe, document precedence, and avoid reusing a name with altered units or meaning.",
      "Choose a versioning mechanism consistently and expose sunset dates, migration examples, client telemetry, and support communication.",
      "Use schema/contract tests and production usage measurements before removing the deprecated behavior."
    ],
    tradeoffs: [
      "Additive evolution avoids version fragmentation but carries temporary response complexity.",
      "Major versions give a clean break but multiply documentation and support burden."
    ],
    failureModes: [
      "A client treats an added enum value as an error and crashes.",
      "A renamed field is removed before uninstrumented clients have migrated."
    ],
    keyTerms: ["additive change", "semantic compatibility", "sunset date", "contract test"],
    commonPitfalls: [
      "Calling a breaking semantic change backward compatible because JSON still parses.",
      "Maintaining versions forever without an adoption or retirement policy."
    ]
  }),
  makeModuleQuestion("api-auth", references.api, {
    slug: "separate-authentication-and-authorization",
    primaryTopicId: "identity-gateways",
    title: "Separate authentication and authorization in a multi-tenant API",
    type: "design",
    difficulty: "intermediate",
    estimatedMinutes: 20,
    tags: ["authentication", "authorization", "multi-tenancy"],
    question:
      "Design a multi-tenant document API where users authenticate with an identity provider, but access depends on organization membership, document ownership, and role. Explain where every check occurs.",
    followUps: [
      "Why is a tenant id supplied by the client not proof of tenant access?",
      "How do stale role claims affect revocation behavior?"
    ],
    hints: [
      "Authentication establishes a principal; authorization decides an action on a resource.",
      "Gateway checks can reject invalid tokens but the resource service knows ownership rules.",
      "Tenant isolation needs a server-derived scope in every data access."
    ],
    summary:
      "Verify identity at the edge, derive trusted principal and tenant context server-side, enforce resource-level authorization in the service/data query, and design claim freshness and audit trails around sensitive role changes.",
    answerPoints: [
      "Validate token signature, issuer, audience, expiry, and intended client before treating identity claims as trusted.",
      "Resolve organization membership and document permissions at the resource boundary; parameterize every query by an authorized tenant scope rather than a caller-provided id alone.",
      "Use roles for coarse grants and ownership/relationship checks for fine-grained access, with deny-by-default behavior.",
      "Log authorization decisions without leaking content, and make high-risk revocation propagate within a defined freshness window."
    ],
    tradeoffs: [
      "Embedding claims reduces lookup latency but can delay revocation.",
      "Central policy engines improve consistency but add a dependency and policy lifecycle."
    ],
    failureModes: [
      "A user changes an organization id in a URL and reads another tenant's document.",
      "A valid but stale token continues to grant a removed administrator role."
    ],
    keyTerms: ["principal", "resource authorization", "tenant scope", "deny by default"],
    commonPitfalls: [
      "Equating successful JWT verification with permission to access every resource.",
      "Trusting a tenant id from request JSON as the authorization boundary."
    ]
  }),
  makeModuleQuestion("api-auth", references.api, {
    slug: "design-api-gateway-responsibilities",
    primaryTopicId: "identity-gateways",
    title: "Design API gateway responsibilities and limits",
    type: "design",
    difficulty: "intermediate",
    estimatedMinutes: 18,
    tags: ["api-gateway", "rate-limiting", "routing"],
    question:
      "A platform introduces an API gateway in front of many services. Decide which concerns belong there and which must remain in services, including authentication, quotas, routing, caching, and business authorization.",
    followUps: [
      "What makes a gateway a single point of failure or a deployment bottleneck?",
      "How would you migrate one route to the gateway safely?"
    ],
    hints: [
      "A gateway is a shared boundary, not a replacement for domain ownership.",
      "Global technical policy differs from contextual business rules.",
      "Every centralized feature needs availability, observability, and rollout planning."
    ],
    summary:
      "Put cross-cutting boundary controls such as TLS termination, token validation, routing, coarse quotas, and request tracing in the gateway; keep domain-specific authorization, validation, and invariants in the owning service.",
    answerPoints: [
      "Use the gateway for standardized authentication verification, service discovery/routing, request-size limits, broad rate limits, correlation ids, and safe response headers.",
      "Keep document ownership, pricing rules, inventory invariants, and data validation close to their authoritative services.",
      "Deploy the gateway redundantly, set explicit timeout/retry policy, and avoid fanout orchestration that obscures ownership and creates a central failure domain.",
      "Migrate with shadowing, route-level metrics, rollback, and compatibility tests rather than a big-bang cutover."
    ],
    tradeoffs: [
      "Centralization yields consistency but can slow teams if every domain change needs gateway coordination.",
      "Service-local controls are flexible but can drift without shared libraries and review."
    ],
    failureModes: [
      "A gateway outage blocks every service because there is no redundant or degraded path.",
      "Business authorization is trusted to a generic gateway that lacks resource context."
    ],
    keyTerms: ["cross-cutting concern", "trust boundary", "route migration", "service ownership"],
    commonPitfalls: [
      "Putting all logic in the gateway because it is the first request hop.",
      "Adding automatic retries at the gateway for non-idempotent writes."
    ]
  })
];

const databaseQuestions: InterviewQuestion[] = [
  makeModuleQuestion("data-modeling", references.database, {
    slug: "choose-relational-or-document-model",
    primaryTopicId: "data-modeling-basics",
    title: "Choose a relational or document model for an order domain",
    type: "compare",
    difficulty: "foundation",
    estimatedMinutes: 18,
    tags: ["relational", "document", "transactions"],
    question:
      "An order domain has customers, orders, line items, promotions, inventory reservations, and reporting queries. Explain how you choose relational tables, document storage, or a hybrid model from invariants and access patterns.",
    followUps: [
      "Which data duplication is an intentional read projection rather than an inconsistency bug?",
      "How does a cross-entity transaction change your choice?"
    ],
    hints: [
      "Start with writes, relationships, and constraints before debating technology names.",
      "A document can be useful when an aggregate is read and updated together.",
      "Reporting may use a different model from transaction processing."
    ],
    summary:
      "Model authoritative order and inventory invariants where transactions and relationships are clear, use documents for bounded aggregate data when access is aggregate-oriented, and build denormalized read projections deliberately with ownership and refresh rules.",
    answerPoints: [
      "List invariants such as inventory not below zero, one payment state per order, and promotion eligibility, then place their authority in a transactional boundary.",
      "Use normalized relations where joins, constraints, and independent updates matter; embed data when it has one owner and is read/written as a bounded unit.",
      "Create reporting/search projections from durable events or change feeds, document their staleness, and never let them become accidental sources of truth.",
      "Design identifiers, deletion/privacy behavior, indexes, and migration needs alongside the logical model."
    ],
    tradeoffs: [
      "Normalization protects consistency but can make broad reads expensive.",
      "Denormalization speeds known reads but creates propagation and reconciliation responsibility."
    ],
    failureModes: [
      "Two services write competing copies of the order state.",
      "A document grows without bound because an unbounded relationship was embedded."
    ],
    keyTerms: ["aggregate boundary", "transaction invariant", "normalization", "read projection"],
    commonPitfalls: [
      "Choosing a database type before stating the required queries and invariants.",
      "Treating duplicated data as automatically wrong rather than defining ownership."
    ]
  }),
  makeModuleQuestion("data-modeling", references.database, {
    slug: "design-index-for-slow-query",
    primaryTopicId: "query-storage",
    title: "Design an index for a slow query",
    type: "debug",
    difficulty: "intermediate",
    estimatedMinutes: 20,
    tags: ["indexes", "query-plan", "postgresql"],
    question:
      "An orders query filters by tenant_id and status, sorts by created_at descending, and returns the first page. Explain how you read the plan, choose an index, and avoid making every write unnecessarily expensive.",
    followUps: [
      "Why does composite index column order matter?",
      "When might a partial index be appropriate?"
    ],
    hints: [
      "Index design follows predicates, sort order, selectivity, and result shape.",
      "EXPLAIN ANALYZE is evidence; guessed indexes can harm writes and storage.",
      "Offset pagination becomes expensive for deep pages."
    ],
    summary:
      "Inspect the actual plan and cardinalities, use a composite index aligned with tenant/status filtering and created-at ordering where justified, and pair it with keyset pagination and index lifecycle monitoring.",
    answerPoints: [
      "Check scan type, rows estimated versus actual, sort step, buffer reads, and query frequency before adding an index.",
      "For a common query shape, consider an index beginning with tenant_id and status followed by created_at in the needed order, then validate it against real plans.",
      "Use keyset pagination with a stable tie-breaker for deep navigation rather than increasing OFFSET cost linearly.",
      "Measure index size, write amplification, vacuum behavior, and whether a partial index matches a stable selective condition."
    ],
    tradeoffs: [
      "A targeted composite index accelerates reads but increases insert/update maintenance.",
      "Partial indexes save space but only help predicates that match their condition."
    ],
    failureModes: [
      "An index supports filtering but not the required sort, causing a large post-scan sort.",
      "Adding indexes for every query shape makes write latency and storage worse."
    ],
    keyTerms: ["query plan", "composite index", "selectivity", "keyset pagination"],
    commonPitfalls: [
      "Adding an index without running the actual query plan.",
      "Using OFFSET for an unbounded activity feed."
    ]
  }),
  makeModuleQuestion("data-modeling", references.database, {
    slug: "design-multi-tenant-data-isolation",
    primaryTopicId: "data-modeling-basics",
    title: "Design multi-tenant data isolation in a shared database",
    type: "design",
    difficulty: "senior",
    estimatedMinutes: 24,
    tags: ["multi-tenancy", "row-level-security", "data-isolation"],
    question:
      "Design a SaaS data model for thousands of organizations sharing a database. Compare shared tables with tenant keys, schema-per-tenant, and database-per-tenant, including access safety and noisy-neighbor behavior.",
    followUps: [
      "How can row-level security complement, but not replace, application authorization?",
      "Which customers justify a different isolation tier?"
    ],
    hints: [
      "Isolation has logical, operational, and performance dimensions.",
      "Every index and unique constraint in a shared table must consider tenant scope.",
      "A migration between isolation tiers needs identifiers and export/import planning."
    ],
    summary:
      "Start with shared tables keyed by tenant when operational scale demands it, enforce tenant scope in application and database layers, make indexes and uniqueness tenant-aware, and define criteria for moving regulated or very large tenants to stronger isolation tiers.",
    answerPoints: [
      "Include tenant_id in rows, access predicates, composite indexes, and uniqueness constraints so two tenants cannot collide or query each other's data.",
      "Derive tenant context from authenticated identity and pass it through a controlled data-access layer; use row-level security or scoped database roles as defense in depth.",
      "Apply quotas, workload isolation, partitioning, and observability by tenant to detect noisy neighbors before they affect everyone.",
      "Design tenant export, deletion, backup restore, and tier migration paths before customer-specific contracts require them."
    ],
    tradeoffs: [
      "Shared tables are operationally efficient but require strong guardrails against query mistakes.",
      "Dedicated databases improve isolation but multiply migration, backup, and connection management."
    ],
    failureModes: [
      "A query omits tenant_id and exposes cross-tenant data.",
      "A global unique constraint prevents different tenants from using the same valid external identifier."
    ],
    keyTerms: ["tenant scope", "row-level security", "composite unique constraint", "noisy neighbor"],
    commonPitfalls: [
      "Using a client-provided tenant id without authorization linkage.",
      "Promising database-per-tenant isolation without an operations plan for thousands of databases."
    ]
  }),
  makeModuleQuestion("data-modeling", references.database, {
    slug: "plan-zero-downtime-database-migration",
    primaryTopicId: "query-storage",
    title: "Plan a zero-downtime database migration",
    type: "design",
    difficulty: "senior",
    estimatedMinutes: 22,
    tags: ["migrations", "backward-compatibility", "rollout"],
    question:
      "A users table must split full_name into given_name and family_name while old and new application versions run during a rolling deploy. Plan the schema, backfill, application rollout, and rollback.",
    followUps: [
      "Why should destructive cleanup be a later separately approved step?",
      "How would you detect writes that still use the deprecated column?"
    ],
    hints: [
      "Expand first, migrate data, dual-read/write if needed, then contract later.",
      "A backfill competes with production load and may race current writes.",
      "Rollback must work before schema cleanup."
    ],
    summary:
      "Use an expand-migrate-contract sequence: add nullable new columns, deploy compatible code, backfill in bounded batches with race handling, validate usage, switch reads, then remove the old column only after the rollback window closes.",
    answerPoints: [
      "Add backward-compatible schema changes first and avoid locking operations during peak traffic where database capabilities require online alternatives.",
      "Deploy code that can read old and new representations and writes both or uses a clear canonical-write rule while old clients exist.",
      "Backfill with pagination, throttling, observability, idempotence, and a strategy for rows modified after their batch is read.",
      "Measure null rates, mismatches, deprecated writes, query errors, and deploy versions before switching read behavior and later scheduling cleanup."
    ],
    tradeoffs: [
      "Dual writes reduce migration risk but create temporary consistency and code complexity.",
      "Fast destructive changes are simpler but make rollback impossible during a real deployment issue."
    ],
    failureModes: [
      "New code assumes backfill is complete and fails on a partially migrated row.",
      "A bulk backfill locks or saturates the database and harms production traffic."
    ],
    keyTerms: ["expand migrate contract", "backfill", "dual write", "rollback window"],
    commonPitfalls: [
      "Dropping the old column in the same deployment that introduces the new one.",
      "Running a backfill once without handling concurrent updates."
    ]
  })
];

const reliabilityQuestions: InterviewQuestion[] = [
  makeModuleQuestion("reliability", references.reliability, {
    slug: "define-slo-for-checkout-api",
    primaryTopicId: "observability",
    title: "Define an SLO and error budget for a checkout API",
    type: "design",
    difficulty: "intermediate",
    estimatedMinutes: 18,
    tags: ["slo", "error-budget", "checkout"],
    question:
      "Define a user-centered SLI, SLO, and error-budget policy for a checkout API. Include what counts as an eligible request, how you treat dependency failures, and what action the team takes when budget is exhausted.",
    followUps: [
      "Why is a CPU-utilization target not an SLO by itself?",
      "How would you protect a launch while the service is out of budget?"
    ],
    hints: [
      "Measure what the user experiences at the boundary, not only internal component health.",
      "An SLO needs a time window, target, and an explicit good/bad event definition.",
      "The error budget should inform real engineering and release choices."
    ],
    summary:
      "Define a checkout success-and-latency SLI from valid user requests, set an achievable target over a stated window, and use the resulting error budget to prioritize reliability work or slow risky change when user reliability is degrading.",
    answerPoints: [
      "Specify eligible traffic and good events, such as correctly authorized checkout requests completed within the user-visible latency objective, excluding only justified client cancellations.",
      "Measure both availability and latency where each affects a successful purchase, and segment by region, device, or dependency if aggregate numbers hide harm.",
      "Set alert thresholds on fast and slow budget burn rather than a single raw error count, with owners and runbooks.",
      "When the budget is exhausted, reduce release risk, focus capacity on remediation, and communicate the trade-off rather than treating the SLO as a dashboard decoration."
    ],
    tradeoffs: [
      "A very high target can consume engineering capacity without matching user value.",
      "Excluding too many errors from the SLI makes the metric untrustworthy."
    ],
    failureModes: [
      "A healthy service metric masks checkout failures caused by an unmodeled dependency.",
      "Teams keep shipping high-risk changes after rapid budget burn with no governance response."
    ],
    keyTerms: ["service level indicator", "service level objective", "error budget", "burn rate"],
    commonPitfalls: [
      "Defining an SLO only from infrastructure CPU or memory metrics.",
      "Setting a target without naming the time window or response to budget exhaustion."
    ]
  }),
  makeModuleQuestion("reliability", references.reliability, {
    slug: "instrument-request-for-fast-debugging",
    primaryTopicId: "observability",
    title: "Instrument a request path for fast production debugging",
    type: "design",
    difficulty: "intermediate",
    estimatedMinutes: 18,
    tags: ["observability", "tracing", "metrics"],
    question:
      "Design metrics, structured logs, and traces for an API that calls Redis, PostgreSQL, and a payment provider. Explain how an on-call engineer uses them together to investigate a latency spike without leaking customer data.",
    followUps: [
      "Which labels create dangerous metric-cardinality growth?",
      "What should a trace contain to correlate a provider failure with a customer request?"
    ],
    hints: [
      "Metrics show aggregate symptoms, traces show one path, and logs provide detailed events.",
      "Correlation ids should cross service boundaries.",
      "Observability data is also a data-handling surface."
    ],
    summary:
      "Instrument RED-style boundary metrics, sampled traces with dependency spans, and structured privacy-safe logs keyed by a correlation id; use the three signals to move from a symptom to the slow or failing dependency quickly.",
    answerPoints: [
      "Emit request rate, error, latency, saturation, cache behavior, database pool, and provider result metrics with bounded labels such as route, region, and result class.",
      "Propagate trace context and record spans for cache, database, and provider calls including timeouts, retries, and sanitized error categories.",
      "Log structured events with request/correlation ids, tenant-safe identifiers, code path, and state transition—not secrets, tokens, raw payment data, or unbounded payloads.",
      "Build dashboards and alerts that link aggregate anomalies to exemplars/traces, then test them during controlled failures."
    ],
    tradeoffs: [
      "High trace sampling improves diagnosis but costs storage and can expose more data if poorly scrubbed.",
      "Too few metric labels hide segment-specific outages; too many destabilize monitoring systems."
    ],
    failureModes: [
      "A trace cannot connect the gateway request to the payment-provider call.",
      "Logs contain sensitive values that make an incident investigation create a privacy incident."
    ],
    keyTerms: ["correlation id", "distributed trace", "bounded cardinality", "structured log"],
    commonPitfalls: [
      "Adding logs everywhere without a consistent correlation or schema convention.",
      "Using customer ids or raw URLs as high-cardinality metric labels."
    ]
  }),
  makeModuleQuestion("reliability", references.reliability, {
    slug: "design-retry-timeout-circuit-breaker-policy",
    primaryTopicId: "resilience-incidents",
    title: "Design retries, timeouts, and circuit breaking coherently",
    type: "design",
    difficulty: "senior",
    estimatedMinutes: 22,
    tags: ["retries", "timeouts", "circuit-breaker"],
    question:
      "An order API calls a payment provider that intermittently returns slow 503s. Design a timeout, retry, circuit-breaker, idempotency, and fallback policy that protects the provider and gives users an honest outcome.",
    followUps: [
      "Why can retries at several layers create a multiplicative outage?",
      "How should a caller distinguish an uncertain charge from a rejected charge?"
    ],
    hints: [
      "A retry should have a clear owner and a bounded budget.",
      "Timeouts need to fit inside one end-to-end deadline.",
      "Payment side effects require idempotency and reconciliation, not blind reissue."
    ],
    summary:
      "Allocate one end-to-end deadline, use short bounded retries with jitter only for classified transient failures, open a circuit when the dependency is unhealthy, and reconcile uncertain idempotent payment outcomes instead of duplicating charges.",
    answerPoints: [
      "Set connection and request timeouts from measured latency and the upstream deadline; propagate cancellation to avoid orphaned work.",
      "Retry at one owned layer with a small budget and exponential backoff plus jitter, never for invalid requests or irreversible effects without idempotency.",
      "Use a circuit breaker and bounded bulkhead to shed or queue noncritical work while exposing a clear pending/failure state to the user.",
      "Record provider idempotency keys and reconcile ambiguous timeouts through provider status before any manual or automatic reattempt."
    ],
    tradeoffs: [
      "Aggressive timeouts improve resource protection but can reject slow successes.",
      "Fallback pending states preserve correctness but may feel less immediate to users."
    ],
    failureModes: [
      "Gateway, service, and SDK each retry three times, creating nine provider calls.",
      "A timed-out charge is retried with a new key and double-charges the customer."
    ],
    keyTerms: ["end-to-end deadline", "retry budget", "circuit breaker", "idempotency"],
    commonPitfalls: [
      "Applying retries to every 5xx without considering ownership and side effects.",
      "Using a circuit breaker with no user-facing or operational recovery behavior."
    ]
  }),
  makeModuleQuestion("reliability", references.reliability, {
    slug: "lead-payment-incident-response",
    primaryTopicId: "resilience-incidents",
    title: "Lead a payment outage incident response",
    type: "design",
    difficulty: "senior",
    estimatedMinutes: 22,
    tags: ["incident-response", "payments", "communication"],
    question:
      "Payment success rate drops sharply after a configuration rollout. Describe your first 30 minutes as incident lead: how you establish scope, mitigate safely, communicate, preserve evidence, and follow up.",
    followUps: [
      "What makes a rollback unsafe for a payment workflow?",
      "Which facts belong in an early stakeholder update when root cause is unknown?"
    ],
    hints: [
      "Separate incident command, technical investigation, communications, and scribing roles.",
      "Mitigation can be a rollback, traffic shift, feature disablement, or reconciliation—not always a restart.",
      "State known impact and uncertainty explicitly."
    ],
    summary:
      "Establish a clear incident command structure, quantify user and financial impact, stop further harm through the lowest-risk mitigation, communicate known facts and next-update time, and preserve event and deployment evidence for reconciliation and learning.",
    answerPoints: [
      "Assign command, investigation, communications, and scribe roles; open a single timeline with deploy ids, metrics, traces, provider responses, and decisions.",
      "Define scope from checkout errors, payment-provider outcomes, geography, configuration exposure, and potentially duplicated or pending charges—not merely server health.",
      "Choose a mitigation that does not create duplicate financial effects: roll back safely, disable the path, route to a healthy configuration, or present a pending state while reconciling.",
      "Send concise updates with impact, actions, current confidence, customer guidance, and the next promised update; follow with blameless root-cause and prioritized prevention work."
    ],
    tradeoffs: [
      "Fast mitigation can reduce diagnostic clarity, so preserve telemetry and decisions before broad changes when feasible.",
      "Detailed public communication helps trust but must not expose customer data or unsupported root-cause claims."
    ],
    failureModes: [
      "Multiple engineers make conflicting changes because no one owns command and the timeline.",
      "A rollback repeats financial side effects or hides pending charges without reconciliation."
    ],
    keyTerms: ["incident commander", "mitigation", "reconciliation", "decision log"],
    commonPitfalls: [
      "Waiting for certain root cause before acknowledging customer impact.",
      "Calling an incident resolved once errors fall without checking financial reconciliation."
    ]
  })
];

const distributedSystemsQuestions: InterviewQuestion[] = [
  makeModuleQuestion("distributed-systems", references.distributed, {
    slug: "choose-consistency-for-account-balance",
    primaryTopicId: "consistency-coordination",
    title: "Choose consistency guarantees for an account balance",
    type: "design",
    difficulty: "senior",
    estimatedMinutes: 24,
    tags: ["consistency", "account-balance", "replication"],
    question:
      "A multi-region wallet service displays an account balance and accepts transfers. Decide which reads and writes need strong consistency, where asynchronous replication is acceptable, and how you prevent a user from spending the same balance twice.",
    scenario:
      "Users expect a newly completed transfer to be visible immediately in their home region. Analytics can lag by several minutes.",
    followUps: [
      "What does read-your-writes mean for the balance screen?",
      "How would you behave when the home region is unavailable but another region has a replica?"
    ],
    hints: [
      "Start from money movement invariants, not from a generic CAP slogan.",
      "A replicated display projection and the authoritative debit decision can have different guarantees.",
      "Network partitions force a choice between accepting a write and preserving the invariant."
    ],
    summary:
      "Keep debit and credit authorization at one strongly consistent authoritative boundary per account, provide read-your-writes through that boundary or a version-aware session route, and use asynchronous replicas only for clearly stale-tolerant projections.",
    answerPoints: [
      "Represent available funds and transfer state with a conditional transactional update or serializable ownership boundary that rejects a debit when the expected balance/version no longer holds.",
      "Route a user's balance writes and immediate reads to the same home region or use a monotonic version/token so a stale replica cannot appear newer than the acknowledged transfer.",
      "Publish durable transfer events to build regional analytics and history projections, documenting their lag rather than silently using them for spend authorization.",
      "During a partition, reject or queue balance-changing operations whose invariant cannot be verified, while allowing explicitly stale historical views where the product permits it."
    ],
    tradeoffs: [
      "Strong cross-region coordination increases latency and can reduce write availability during a partition.",
      "Asynchronous projections improve read locality but require visible freshness and reconciliation semantics."
    ],
    failureModes: [
      "A stale regional replica approves a second debit after a transfer has already spent the funds.",
      "A client sees an old balance after an acknowledged write and repeats a transfer."
    ],
    keyTerms: ["read-your-writes", "conditional update", "authoritative boundary", "replica lag"],
    commonPitfalls: [
      "Saying every account read needs global strong consistency without separating display and authorization paths.",
      "Treating asynchronous replication as safe for an invariant that prevents overspending."
    ]
  }),
  makeModuleQuestion("distributed-systems", references.distributed, {
    slug: "design-saga-for-travel-booking",
    primaryTopicId: "consistency-coordination",
    title: "Design a saga for a travel booking workflow",
    type: "design",
    difficulty: "senior",
    estimatedMinutes: 26,
    tags: ["saga", "compensation", "workflows"],
    question:
      "A travel site must reserve a flight, hotel, and rental car from independent systems, then charge the customer. Design a failure-safe workflow without a distributed two-phase commit.",
    scenario:
      "Each supplier can time out after accepting a request, and a partial reservation may expire automatically after fifteen minutes.",
    followUps: [
      "How do you distinguish a failed reservation from an uncertain reservation?",
      "What happens when a compensation action itself fails?"
    ],
    hints: [
      "A saga coordinates local transactions with forward actions and compensations.",
      "Every external call needs a stable operation id and observable state.",
      "Compensation restores business meaning where possible; it is not a database rollback."
    ],
    summary:
      "Persist a durable booking state machine and outbox, issue idempotent supplier commands, move through explicit success and uncertainty states, and run compensations or manual reconciliation when a later step cannot complete.",
    answerPoints: [
      "Create one booking id and record each step's desired state, supplier request id, response, timeout, and retry policy in an authoritative workflow store before issuing external commands.",
      "Use an orchestration flow when the product needs centralized visibility and ordering; publish durable state transitions so support and consumers can see a booking is pending, confirmed, or compensating.",
      "On a downstream failure, cancel previously confirmed reservations with idempotent compensation commands; if cancellation is uncertain or fails, keep the saga open for reconciliation rather than declaring success.",
      "Charge only at a deliberate point and make payment reversal/refund its own explicit compensating business operation with audit records."
    ],
    tradeoffs: [
      "Orchestration gives a clear audit trail but makes one workflow service responsible for progression.",
      "Choreography reduces central coordination but makes timeout and compensation visibility harder."
    ],
    failureModes: [
      "A supplier accepts a reservation but its timeout is interpreted as a failure and the user retries with a new id.",
      "A failed hotel cancellation is silently ignored after the flight is refunded."
    ],
    keyTerms: ["saga", "compensation", "idempotent command", "reconciliation"],
    commonPitfalls: [
      "Calling a sequence of retries a saga without durable workflow state.",
      "Assuming compensation always restores the exact prior physical state."
    ]
  }),
  makeModuleQuestion("distributed-systems", references.distributed, {
    slug: "shard-high-volume-chat-messages",
    primaryTopicId: "partitioning-scalability",
    title: "Shard high-volume chat messages without breaking conversation order",
    type: "design",
    difficulty: "senior",
    estimatedMinutes: 25,
    tags: ["sharding", "chat", "hot-partitions"],
    question:
      "Design storage and routing for chat messages across millions of conversations. Messages inside one conversation must appear in order, while a small number of live broadcasts create extreme hot partitions.",
    scenario:
      "Clients can tolerate a brief reconnect gap but must be able to fetch missing messages deterministically.",
    followUps: [
      "How would you migrate a conversation to a new shard?",
      "What changes for a broadcast room with millions of readers?"
    ],
    hints: [
      "Choose a partition key from the ordering scope, then test it against skew.",
      "A shard map needs versioning for safe migration.",
      "Write ordering, reader fanout, and history storage can use different components."
    ],
    summary:
      "Route normal conversation writes by conversation id to preserve local order, attach monotonically ordered message identifiers, use a versioned shard map for moves, and separate hot broadcast fanout from the authoritative append log.",
    answerPoints: [
      "Assign each conversation to a shard using a stable routing function or shard-map entry; serialize or sequence writes per conversation rather than claiming global order.",
      "Store a durable monotonically increasing message position so reconnecting clients can request a gap range and deduplicate retried sends by client message id.",
      "Migrate a conversation through a versioned routing record, controlled drain/copy/cutover, and read fallback so writers do not split one sequence across shards accidentally.",
      "For broadcasts, publish once to a scalable fanout layer or edge channels while retaining the canonical message history separately from per-recipient delivery."
    ],
    tradeoffs: [
      "Conversation-level routing preserves order but makes an exceptionally active room a single-write hotspot.",
      "Splitting a hot room improves throughput but requires a new ordering model and client merge behavior."
    ],
    failureModes: [
      "A stale shard map sends a message to the old shard after cutover and forks conversation history.",
      "Broadcast fanout writes one durable copy per recipient and overwhelms storage."
    ],
    keyTerms: ["partition key", "shard map", "message position", "hot partition"],
    commonPitfalls: [
      "Using a random shard per message and then trying to reconstruct order later.",
      "Treating broadcast delivery acknowledgments as the same problem as durable conversation history."
    ]
  }),
  makeModuleQuestion("distributed-systems", references.distributed, {
    slug: "evaluate-leader-election-for-scheduled-job",
    primaryTopicId: "consistency-coordination",
    title: "Evaluate leader election for a scheduled job",
    type: "design",
    difficulty: "senior",
    estimatedMinutes: 22,
    tags: ["leader-election", "leases", "fencing"],
    question:
      "Several service instances must run a daily settlement job once. Explain leader election, lease expiry, fencing, and why the settlement write must still defend against duplicate execution.",
    scenario:
      "An instance can pause longer than the lease due to a runtime stall and resume after another instance becomes leader.",
    followUps: [
      "What evidence should a new leader use before resuming a partially completed settlement?",
      "When is a database uniqueness constraint preferable to distributed leader election?"
    ],
    hints: [
      "A lease says who may act for a bounded interval, not that an old process cannot resume.",
      "Fencing makes the protected resource reject stale leaders.",
      "The business operation needs an idempotent identity independent of the elected process."
    ],
    summary:
      "Use a fault-tolerant lease only to reduce concurrent schedulers, issue monotonic fencing tokens or use a database constraint at the settlement boundary, and persist progress keyed by business date so a resumed instance cannot duplicate money movement.",
    answerPoints: [
      "Acquire and renew a lease through a coordination system with a unique owner and bounded expiry; stop work when renewal cannot be confirmed.",
      "Pass a monotonically increasing fencing token or expected version to the settlement store so it rejects commands from an old leader that wakes after its lease expired.",
      "Make the settlement record unique on business date/account scope and record step progress, allowing a new leader to resume or reconcile safely.",
      "Monitor lease churn, job start/finish, fencing rejections, overdue runs, and partial-state age rather than relying on one leader log line."
    ],
    tradeoffs: [
      "Leader election reduces duplicate work but adds timing and failover assumptions.",
      "A transactional uniqueness constraint is simpler when the job is one bounded database operation."
    ],
    failureModes: [
      "A paused old leader finishes after a new leader and applies a stale settlement result.",
      "A job lock prevents overlap but no durable record explains whether yesterday's job completed."
    ],
    keyTerms: ["lease", "fencing token", "idempotent job", "monotonic version"],
    commonPitfalls: [
      "Treating a successful leader-election call as permanent authority.",
      "Using a process hostname as the business idempotency key."
    ]
  })
];

const securityQuestions: InterviewQuestion[] = [
  makeModuleQuestion("security-case-studies", references.security, {
    slug: "threat-model-file-sharing-api",
    primaryTopicId: "threat-modeling-case-studies",
    title: "Threat-model a multi-tenant file-sharing API",
    type: "design",
    difficulty: "senior",
    estimatedMinutes: 26,
    tags: ["threat-modeling", "file-sharing", "multi-tenancy"],
    question:
      "Threat-model a file-sharing API where users upload documents, create expiring share links, and invite collaborators across organizations. Identify assets, trust boundaries, abuse cases, and the highest-value mitigations.",
    scenario:
      "Files may contain sensitive customer data, and share links are sometimes forwarded outside the intended organization.",
    followUps: [
      "How do signed URLs differ from authorization on the application API?",
      "Which mitigations limit damage if a share-link token leaks?"
    ],
    hints: [
      "Map data flow from browser to upload store, metadata API, preview processor, and download delivery.",
      "Think about identity, authorization, content safety, token leakage, and resource exhaustion separately.",
      "Prioritize threats by impact and likelihood instead of making a generic security checklist."
    ],
    summary:
      "Map the document and permission data flows, require authenticated tenant-scoped authorization for every metadata action, use short-lived narrowly scoped download tokens, and layer malware scanning, abuse limits, audit trails, and revocation around high-risk sharing paths.",
    answerPoints: [
      "Identify assets such as document contents, keys, permission graphs, share tokens, audit records, and preview-worker execution; identify browser, API, object storage, and third-party processing boundaries.",
      "Enforce object-level authorization server-side for every document action, derive tenant context from identity, and never accept a document id or organization id as proof of permission.",
      "Issue signed download URLs with minimal object scope, short expiry, no broad list permission, and revocation/version controls; log access without exposing document content.",
      "Scan uploads, isolate preview processing, rate-limit expensive operations, validate content types, and give administrators tools to revoke links and investigate unusual access."
    ],
    tradeoffs: [
      "Short-lived signed links reduce exposure but can make long downloads and offline workflows less convenient.",
      "Deep content scanning improves safety but adds latency and requires a safe quarantine path."
    ],
    failureModes: [
      "An authenticated user alters a document id and downloads another tenant's file.",
      "A long-lived signed URL leaks through logs or referrers and remains usable after permission revocation."
    ],
    keyTerms: ["trust boundary", "object-level authorization", "signed url", "token revocation"],
    commonPitfalls: [
      "Calling a file private because its storage bucket is not public while API authorization is missing.",
      "Focusing only on external attackers and ignoring an authorized user's lateral access."
    ]
  }),
  makeModuleQuestion("security-case-studies", references.security, {
    slug: "design-secrets-lifecycle-for-services",
    primaryTopicId: "application-security",
    title: "Design a secure secrets lifecycle for services",
    type: "design",
    difficulty: "intermediate",
    estimatedMinutes: 20,
    tags: ["secrets", "workload-identity", "rotation"],
    question:
      "Design how a service obtains database credentials and third-party API keys in development, CI, and production. Include least privilege, rotation, audit, and response to a leaked secret.",
    scenario:
      "Engineers currently copy long-lived keys into local environment files and CI variables shared across several projects.",
    followUps: [
      "Why is encrypting a secret in Git not sufficient lifecycle management?",
      "How do short-lived workload credentials reduce but not eliminate risk?"
    ],
    hints: [
      "A secret has creation, distribution, use, rotation, revocation, and audit stages.",
      "Workload identity can authenticate a running service without a static bootstrap key.",
      "Different environments need explicit separation and ownership."
    ],
    summary:
      "Use environment-scoped secret management and workload identities to deliver narrowly scoped credentials at runtime, rotate them through overlapping validity, audit access, and rehearse immediate revocation and redeployment when exposure is suspected.",
    answerPoints: [
      "Give each service and environment a distinct identity and minimal permissions; avoid shared human or cross-project production keys.",
      "Fetch secrets at runtime from an access-controlled manager or issue short-lived credentials from workload identity, keeping them out of source, images, logs, and client telemetry.",
      "Automate rotation with two valid versions or provider-supported overlap, health checks, and rollback so rotation does not become a manual outage risk.",
      "On suspected leakage, revoke or rotate the affected credential, assess access logs and blast radius, remove accidental copies, and document prevention controls."
    ],
    tradeoffs: [
      "Runtime retrieval adds a dependency but removes static secret sprawl.",
      "Short-lived credentials reduce exposure window but need reliable refresh and clock handling."
    ],
    failureModes: [
      "One leaked CI variable grants every environment production access.",
      "A rotation invalidates the only credential before all service instances can refresh."
    ],
    keyTerms: ["workload identity", "least privilege", "secret rotation", "revocation"],
    commonPitfalls: [
      "Putting production keys in encrypted configuration without defining who can decrypt or rotate them.",
      "Logging connection strings or API headers while debugging a deployment."
    ]
  }),
  makeModuleQuestion("security-case-studies", references.security, {
    slug: "prevent-broken-object-level-authorization",
    primaryTopicId: "application-security",
    title: "Prevent broken object-level authorization in an API",
    type: "debug",
    difficulty: "senior",
    estimatedMinutes: 22,
    tags: ["authorization", "idor", "api-security"],
    question:
      "A security test finds that changing /invoices/123 to /invoices/124 returns another customer's invoice for some users. Diagnose the design failure and propose defense-in-depth fixes across routing, data access, tests, and monitoring.",
    scenario:
      "The API already validates JWTs and uses opaque invoice ids, but an internal support role has broad access.",
    followUps: [
      "Why do opaque identifiers not replace an authorization check?",
      "How would you safely authorize a support role with exceptional access?"
    ],
    hints: [
      "Authentication proves identity; it does not bind a principal to a requested resource.",
      "The data query is an important enforcement point.",
      "Tests must cover both allowed and denied cross-tenant cases."
    ],
    summary:
      "Authorize every requested invoice against the authenticated principal and server-derived tenant/relationship before loading or returning it, make scoped data access the default, and test and audit both normal and exceptional access paths.",
    answerPoints: [
      "Resolve the principal and organization scope from verified identity, then query invoices with the authorized tenant/ownership predicate instead of fetching by id first and checking later.",
      "Represent support escalation as a separate narrowly scoped policy with reason, approval, time limit, and audit event rather than granting a universal bypass.",
      "Add integration tests that vary user, tenant, invoice id, role, and endpoint method, asserting indistinguishable not-found or forbidden behavior according to product policy.",
      "Monitor authorization denials, unusual enumeration patterns, support-access audits, and cross-tenant query anomalies without logging invoice contents."
    ],
    tradeoffs: [
      "Central policy helpers reduce repeated mistakes but need clear resource context and review.",
      "Detailed support auditing adds workflow friction but contains privileged-access risk."
    ],
    failureModes: [
      "A handler verifies a JWT then performs an unscoped invoice lookup by path id.",
      "A broad support role bypass is reused by ordinary service accounts."
    ],
    keyTerms: ["object-level authorization", "tenant-scoped query", "least privilege", "audit trail"],
    commonPitfalls: [
      "Assuming unpredictable ids prevent unauthorized access.",
      "Testing only that an authorized user can fetch their own invoice."
    ]
  }),
  makeModuleQuestion("security-case-studies", references.security, {
    slug: "design-privacy-deletion-and-audit-workflow",
    primaryTopicId: "threat-modeling-case-studies",
    title: "Design a privacy deletion and audit workflow",
    type: "design",
    difficulty: "senior",
    estimatedMinutes: 25,
    tags: ["privacy", "data-deletion", "audit"],
    question:
      "Design a workflow for a verified user requesting deletion of personal data across the primary database, search index, analytics warehouse, caches, backups, and event streams. Explain identity verification, legal holds, asynchronous completion, and auditability.",
    scenario:
      "Some transaction records must remain for financial compliance, but unnecessary personal profile data should be deleted or irreversibly anonymized.",
    followUps: [
      "Why is deleting one database row not enough?",
      "How do you make an audit record useful without retaining the deleted personal data?"
    ],
    hints: [
      "Data inventory and ownership come before a deletion job.",
      "Deletion, anonymization, suppression, and retention hold are distinct outcomes.",
      "Backups and immutable logs require a documented lifecycle rather than an impossible instant promise."
    ],
    summary:
      "Verify the requester, inventory every personal-data projection and retention obligation, orchestrate idempotent deletion or anonymization jobs with status and evidence, suppress future re-ingestion, and communicate the bounded backup/event-retention timeline honestly.",
    answerPoints: [
      "Classify fields by purpose, owner, retention requirement, and identifier mapping; separate data that must be retained under legal basis from data eligible for deletion or irreversible pseudonymization.",
      "Create a durable request workflow with request id, verified subject, scope, legal-hold decision, per-system tasks, retries, completion evidence, and an externally visible status.",
      "Invalidate caches and search projections, publish a minimal deletion/tombstone event where appropriate, and maintain a suppression record so imports or retries do not recreate the profile.",
      "Keep an audit trail of request identity verification, actions, timestamps, and policy decisions while avoiding raw deleted content; document backup expiry and restoration safeguards."
    ],
    tradeoffs: [
      "Central orchestration improves evidence and progress visibility but needs integration ownership across systems.",
      "Immediate hard deletion reduces exposure but may conflict with legal retention or fraud investigation needs."
    ],
    failureModes: [
      "A deleted profile remains discoverable through a search index or cache.",
      "A backup restore reintroduces personal data because the deletion event and restore procedure are not coordinated."
    ],
    keyTerms: ["data inventory", "anonymization", "suppression record", "retention hold"],
    commonPitfalls: [
      "Promising instant deletion from immutable backups without a restore-time control plan.",
      "Keeping complete personal data in the audit log to prove deletion occurred."
    ]
  })
];

export const questions: InterviewQuestion[] = [
  ...foundationsQuestions,
  ...apiQuestions,
  ...databaseQuestions,
  ...redisQuestions,
  ...kafkaQuestions,
  ...reliabilityQuestions,
  ...distributedSystemsQuestions,
  ...securityQuestions
];

export const curriculum: CurriculumCatalog = {
  schemaVersion: CATALOG_SCHEMA_VERSION,
  version: "2026.08.2",
  modules,
  topics,
  questions
};

// Content errors should fail local development and production builds immediately.
assertValidCurriculum(curriculum);
