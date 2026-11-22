// Starter designs. Positions are relative to where the template is dropped.
// Containers are detected by position, so only coordinates and sizes matter.
window.AWS_TEMPLATES = [
  {
    id: 'three-tier', name: 'Three-tier web app (Multi-AZ)',
    nodes: [
      { id: 'u', type: 'users', x: 0, y: 200 },
      { id: 'rg', type: 'c-region', x: 170, y: 0, w: 900, h: 610 },
      { id: 'vpc', type: 'c-vpc', x: 190, y: 40, w: 860, h: 550 },
      { id: 'alb', type: 'elb', x: 560, y: 70, label: 'Load balancer' },
      { id: 'aza', type: 'c-az', x: 210, y: 180, w: 400, h: 390, props: { name: 'a' } },
      { id: 'azb', type: 'c-az', x: 630, y: 180, w: 400, h: 390, props: { name: 'b' } },
      { id: 'pua', type: 'c-public', x: 230, y: 220, w: 360, h: 150 },
      { id: 'pub', type: 'c-public', x: 650, y: 220, w: 360, h: 150 },
      { id: 'pra', type: 'c-private', x: 230, y: 390, w: 360, h: 150 },
      { id: 'prb', type: 'c-private', x: 650, y: 390, w: 360, h: 150 },
      { id: 'e1', type: 'ec2', x: 350, y: 245, label: 'App server', props: { asg: true } },
      { id: 'e2', type: 'ec2', x: 770, y: 245, label: 'App server', props: { asg: true } },
      { id: 'd1', type: 'rds', x: 350, y: 415, label: 'Primary DB', props: { multiAz: true } },
      { id: 'd2', type: 'rds', x: 770, y: 415, label: 'Standby DB', props: { multiAz: true } }
    ],
    links: [['u', 'alb', 'HTTPS'], ['alb', 'e1', 'HTTP'], ['alb', 'e2', 'HTTP'], ['e1', 'd1', 'SQL'], ['e2', 'd1', 'SQL'], ['d1', 'd2', 'Sync replication', true]]
  },
  {
    id: 'serverless-api', name: 'Serverless API with static front end',
    nodes: [
      { id: 'u', type: 'users', x: 0, y: 180 },
      { id: 'rg', type: 'c-region', x: 170, y: 0, w: 800, h: 520 },
      { id: 'cf', type: 'cloudfront', x: 230, y: 60 },
      { id: 's3', type: 's3', x: 430, y: 60, label: 'Website files' },
      { id: 'cog', type: 'cognito', x: 230, y: 380 },
      { id: 'api', type: 'apigateway', x: 230, y: 220 },
      { id: 'fn', type: 'lambda', x: 450, y: 220, label: 'Business logic' },
      { id: 'db', type: 'dynamodb', x: 670, y: 220, props: { capacity: 'On-demand' } }
    ],
    links: [['u', 'cf', 'HTTPS'], ['cf', 's3'], ['u', 'api', 'API calls'], ['cog', 'api', 'Auth'], ['api', 'fn'], ['fn', 'db', 'Reads / writes']]
  },
  {
    id: 'static-site', name: 'Static website with CDN and WAF',
    nodes: [
      { id: 'u', type: 'users', x: 0, y: 90 },
      { id: 'r53', type: 'route53', x: 170, y: 90 },
      { id: 'waf', type: 'waf', x: 340, y: 240 },
      { id: 'cf', type: 'cloudfront', x: 340, y: 90 },
      { id: 'acm', type: 'acm', x: 510, y: 240, label: 'TLS certificate' },
      { id: 's3', type: 's3', x: 510, y: 90, label: 'Site bucket', props: { block: true } }
    ],
    links: [['u', 'r53', 'DNS'], ['r53', 'cf'], ['waf', 'cf', 'Filters'], ['acm', 'cf', 'HTTPS cert', true], ['cf', 's3', 'Origin']]
  },
  {
    id: 'event-driven', name: 'Event-driven processing with queue',
    nodes: [
      { id: 'u', type: 'users', x: 0, y: 90, props: { kind: 'Third-party system' } },
      { id: 'rg', type: 'c-region', x: 170, y: 0, w: 900, h: 420 },
      { id: 's3', type: 's3', x: 210, y: 90, label: 'Uploads' },
      { id: 'sns', type: 'sns', x: 390, y: 90 },
      { id: 'q', type: 'sqs', x: 570, y: 90, props: { dlq: true } },
      { id: 'fn', type: 'lambda', x: 750, y: 90, label: 'Worker', props: { invoke: 'Event source mapping' } },
      { id: 'db', type: 'dynamodb', x: 750, y: 260 },
      { id: 'dlq', type: 'sqs', x: 570, y: 260, label: 'Dead-letter queue' }
    ],
    links: [['u', 's3', 'Uploads'], ['s3', 'sns', 'Event'], ['sns', 'q', 'Fan-out'], ['q', 'fn', 'Poll'], ['fn', 'db', 'Writes'], ['q', 'dlq', 'Failures', true]]
  }
];
