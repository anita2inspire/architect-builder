#!/usr/bin/env python3
"""
Import AWS Architecture Icons into the builder.

1. Download the "Asset Package" from https://aws.amazon.com/architecture/icons/ and unzip it
   (or leave it zipped).
2. From the project folder run:

       python3 tools/import-icons.py /path/to/Asset-Package-folder-or.zip

This copies the 64px service icons into icons/<service-id>.svg and rewrites data/icons.js so the
builder uses them. Services without a match keep their coloured badge.

Other commands:
       python3 tools/import-icons.py --rebuild     # regenerate data/icons.js from the icons/ folder
       python3 tools/import-icons.py PACK --report # show matches without copying anything

To fix a miss by hand: save the SVG as icons/<service-id>.svg, then run --rebuild.
Only the Python standard library is used.
"""
import difflib, json, os, re, shutil, sys, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ICON_DIR = os.path.join(ROOT, 'icons')
DATA_DIR = os.path.join(ROOT, 'data')

# Extra names a service is known by in the icon pack (normalised: lowercase letters and digits only).
ALIASES = {
  'ec2': ['elasticcomputecloud'], 's3': ['simplestorageservice'], 'rds': ['relationaldatabaseservice'],
  'vpc': ['virtualprivatecloud'], 'elb': ['elasticloadbalancing'], 'sqs': ['simplequeueservice'],
  'sns': ['simplenotificationservice'], 'iam': ['identityandaccessmanagement'], 'kms': ['keymanagementservice'],
  'ebs': ['elasticblockstore'], 'efs': ['elasticfilesystem'], 'ecs': ['elasticcontainerservice'],
  'eks': ['elastickubernetesservice'], 'ecr': ['elasticcontainerregistry'], 'asg': ['ec2autoscaling'],
  'beanstalk': ['elasticbeanstalk'], 'ssm': ['systemsmanager'], 'sagemaker': ['sagemakerai'],
  'identitycenter': ['iamidentitycenter'], 'secrets': ['secretsmanager'], 'acm': ['certificatemanager'],
  'msk': ['managedstreamingforapachekafka'], 'opensearch': ['opensearchservice'], 'quick': ['quicksight'],
  'dms': ['databasemigrationservice'], 'mgn': ['applicationmigrationservice'], 'snow': ['snowfamily'],
  'transfer': ['transferfamily'], 'networkfw': ['networkfirewall'], 'firewallmgr': ['firewallmanager'],
  'directory': ['directoryservice'], 'ram': ['resourceaccessmanager'], 'tgw': ['transitgateway'],
  's2svpn': ['sitetositevpn'], 'globalaccel': ['globalaccelerator'], 'cur': ['costandusagereport'],
  'kvs': ['kinesisvideostreams'], 'storagegw': ['storagegateway'], 'glacier': ['s3glacier'],
  'outposts': ['outpostsfamily', 'outpostsrack'], 'vmware': ['vmwarecloudonaws'], 'sar': ['serverlessapplicationrepository'],
  'health': ['healthdashboard', 'health'], 'licensemgr': ['licensemanager'], 'grafana': ['managedgrafana'],
  'prometheus': ['managedserviceforprometheus'], 'console': ['managementconsole'], 'cli': ['commandlineinterface'],
  'wellarchitected': ['wellarchitectedtool'], 'discovery': ['applicationdiscoveryservice'],
  'cloudwatch': ['cloudwatch'], 'apigateway': ['apigateway'], 'dynamodb': ['dynamodb'],
  'auroraserverless': ['aurora'], 'datapipeline': ['datapipeline'], 'eventbridge': ['eventbridge'],
  'stepfunctions': ['stepfunctions'], 'lakeformation': ['lakeformation'], 'computeoptimizer': ['computeoptimizer'],
  'savingsplans': ['savingsplans'], 'users': ['users', 'user', 'client'], 'onprem': ['corporatedatacenter', 'servers']
}

def norm(s):
    s = os.path.splitext(os.path.basename(s))[0].lower()
    s = re.sub(r'^(arch|res)[_-]', '', s)
    s = re.sub(r'[_-](16|32|48|64)$', '', s)
    s = s.replace('amazon', '').replace('aws', '')
    return re.sub(r'[^a-z0-9]', '', s)

def size_of(path):
    m = re.search(r'[_-](16|32|48|64)\.svg$', path.lower())
    return int(m.group(1)) if m else 0

def load_services():
    """Read ids and names out of data/*.js without needing Node."""
    out = {}
    for fn in sorted(os.listdir(DATA_DIR)):
        if not fn.startswith('services-'): continue
        txt = open(os.path.join(DATA_DIR, fn), encoding='utf-8').read()
        for m in re.finditer(r"\bd\('([^']+)',\s*'([^']+)'", txt):
            out[m.group(1)] = m.group(2)
    for m in re.finditer(r"defSvc\('([^']+)',\s*'([^']+)'", open(os.path.join(DATA_DIR, 'services-3.js'), encoding='utf-8').read()):
        out[m.group(1)] = m.group(2)
    return out

def collect(pack):
    """Return {path_label: bytes_getter} for every .svg in a folder or zip."""
    files = {}
    if os.path.isdir(pack):
        for d, _, fs in os.walk(pack):
            for f in fs:
                if f.lower().endswith('.svg') and not f.startswith('.'):
                    p = os.path.join(d, f); files[p] = (lambda p=p: open(p, 'rb').read())
    elif zipfile.is_zipfile(pack):
        z = zipfile.ZipFile(pack)
        for n in z.namelist():
            if n.lower().endswith('.svg') and '__MACOSX' not in n and not os.path.basename(n).startswith('.'):
                files[n] = (lambda n=n: z.read(n))
    else:
        sys.exit('Not a folder or zip file: ' + pack)
    return files

def write_manifest():
    ids = sorted(f[:-4] for f in os.listdir(ICON_DIR) if f.endswith('.svg')) if os.path.isdir(ICON_DIR) else []
    with open(os.path.join(DATA_DIR, 'icons.js'), 'w') as f:
        f.write('// Generated by tools/import-icons.py. Lists service ids that have icons/<id>.svg.\n')
        f.write('window.AWS_ICONS = ' + json.dumps(ids) + ';\n')
    return ids

def main(argv):
    if '--rebuild' in argv:
        ids = write_manifest(); print('data/icons.js now lists %d icons.' % len(ids)); return
    args = [a for a in argv if not a.startswith('--')]
    if not args: print(__doc__); return
    report_only = '--report' in argv
    files = collect(args[0])
    if not files: sys.exit('No .svg files found in ' + args[0])

    # Index by normalised name; prefer Arch_ (service) files over Res_ and larger sizes.
    index = {}
    for path in files:
        base = os.path.basename(path)
        key = norm(base)
        rank = (0 if base.lower().startswith('arch') else 1, -size_of(path))
        if key not in index or rank < index[key][0]: index[key] = (rank, path)

    services = load_services()
    matched, missed = {}, []
    for sid, name in services.items():
        for cand in [norm(name)] + ALIASES.get(sid, []):
            if cand and cand in index: matched[sid] = index[cand][1]; break
        else: missed.append(sid)

    print('Matched %d of %d services.' % (len(matched), len(services)))
    if not report_only:
        os.makedirs(ICON_DIR, exist_ok=True)
        for sid, path in matched.items():
            with open(os.path.join(ICON_DIR, sid + '.svg'), 'wb') as f: f.write(files[path]())
        write_manifest()
        print('Copied icons to icons/ and updated data/icons.js.')
    if missed:
        print('\nNo match (these keep their coloured badge):')
        for sid in missed:
            close = difflib.get_close_matches(norm(services[sid]), list(index), n=2, cutoff=0.8) if len(norm(services[sid])) > 5 else []
            hint = '   maybe: ' + ', '.join(os.path.basename(index[c][1]) for c in close) if close else ''
            print('  %-18s %s%s' % (sid, services[sid], hint))
        print('\nTo add one by hand: save it as icons/<id>.svg, then run: python3 tools/import-icons.py --rebuild')

if __name__ == '__main__':
    main(sys.argv[1:])
