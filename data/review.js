// Well-Architected self-review. These are prompts for you to answer, not automatic checks.
window.AWS_REVIEW = [
  { id: 'rel', name: 'Reliability', items: [
    { id: 'rel1', q: 'If one Availability Zone fails, does the workload keep running?', look: 'Multi-AZ RDS, Auto Scaling across AZs, ALB, Aurora replicas' },
    { id: 'rel2', q: 'Is there any single point of failure?', look: 'One EC2, one NAT Gateway, one AZ, a single AWS Direct Connect link' },
    { id: 'rel3', q: 'Can the design recover from a Region outage within the stated RTO and RPO?', look: 'Cross-region replication, Global Tables, Route 53 failover, AWS Backup copies' },
    { id: 'rel4', q: 'Are components decoupled so one slow part does not stall the rest?', look: 'SQS, SNS, EventBridge, Kinesis' }
  ]},
  { id: 'sec', name: 'Security', items: [
    { id: 'sec1', q: 'Are databases and app servers in private subnets?', look: 'Public vs private subnet, NAT Gateway, VPC endpoints' },
    { id: 'sec2', q: 'Is data encrypted at rest and in transit?', look: 'KMS, ACM, HTTPS on ALB and CloudFront, encrypted EBS, RDS and S3' },
    { id: 'sec3', q: 'Does each component have only the access it needs?', look: 'IAM roles, security groups, bucket policies, Block Public Access' },
    { id: 'sec4', q: 'How are secrets stored, and is the edge protected from common attacks?', look: 'Secrets Manager, WAF, Shield, GuardDuty' }
  ]},
  { id: 'perf', name: 'Performance efficiency', items: [
    { id: 'perf1', q: 'Is content served close to users?', look: 'CloudFront, Global Accelerator, Route 53 latency routing' },
    { id: 'perf2', q: 'Does the database tier match the access pattern?', look: 'RDS vs Aurora vs DynamoDB, ElastiCache or DAX for hot reads, read replicas' },
    { id: 'perf3', q: 'Does capacity follow demand without manual work?', look: 'Auto Scaling, Lambda, Aurora Serverless, DynamoDB on-demand' },
    { id: 'perf4', q: 'Are the instance family and storage type right for the workload?', look: 'Compute vs memory optimized, gp3 vs io2, EFS vs FSx' }
  ]},
  { id: 'cost', name: 'Cost optimization', items: [
    { id: 'cost1', q: 'Is steady load on Reserved Instances or Savings Plans, and bursty or fault-tolerant load on Spot?', look: 'EC2 purchase option, Savings Plans, Spot task nodes' },
    { id: 'cost2', q: 'Are you paying for idle capacity?', look: 'Serverless options, scale to zero, right-sized instances' },
    { id: 'cost3', q: 'Does data move to cheaper storage as it ages?', look: 'S3 lifecycle rules, Intelligent-Tiering, Glacier' },
    { id: 'cost4', q: 'Are the expensive data paths avoided?', look: 'Cross-AZ and cross-region transfer, NAT Gateway traffic, VPC endpoints' }
  ]},
  { id: 'ops', name: 'Operational excellence', items: [
    { id: 'ops1', q: 'Can you see what the system is doing?', look: 'CloudWatch metrics, logs and alarms, X-Ray, CloudTrail' },
    { id: 'ops2', q: 'Is the infrastructure defined as code and repeatable?', look: 'CloudFormation, Service Catalog, Control Tower' },
    { id: 'ops3', q: 'Can you patch and manage servers without opening SSH?', look: 'Systems Manager, Session Manager' },
    { id: 'ops4', q: 'Are changes and failures detected and acted on automatically?', look: 'Config rules, EventBridge, Health Dashboard' }
  ]},
  { id: 'sus', name: 'Sustainability', items: [
    { id: 'sus1', q: 'Is compute sized to real usage?', look: 'Compute Optimizer, Graviton, serverless' },
    { id: 'sus2', q: 'Do you keep data only as long as needed?', look: 'S3 lifecycle expiry, DynamoDB TTL, log retention' },
    { id: 'sus3', q: 'Can work run in the most efficient place and time?', look: 'Batch jobs on Spot, scheduled scaling, managed services' }
  ]}
];
