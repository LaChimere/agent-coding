#!/usr/bin/env python3
"""One-off generator for the hermetic scanner eval fixture data.

Kept out of the eval corpus itself; run manually when regenerating fixture JSON.
"""

import json
import re
from pathlib import Path
from typing import Any

ROOT = (
    Path(__file__).resolve().parents[2]
    / 'evals/scan-image-vulnerabilities/files/trivy-fixture/images'
)

SCHEMA_VERSION = 2
ARTIFACT_TYPE = 'container_image'
OS_PKGS_CLASS = 'os-pkgs'
DEFAULT_RELEASE = 'r0'


def name(image: str) -> str:
    """Sanitize an image reference into a filesystem-safe fixture file stem."""
    return re.sub(r'[^A-Za-z0-9._-]', '_', image)


def write(image: str, document: dict[str, Any]) -> None:
    """Write `document` as pretty-printed JSON to the fixture path for `image`."""
    path = ROOT / f'{name(image)}.json'
    path.write_text(json.dumps(document, indent=2) + '\n', encoding='utf-8')


def write_dense(image: str, document: dict[str, Any]) -> None:
    """Serialize with every vulnerability object on a single line to stay reviewable."""
    lines = [
        '{',
        f'  "SchemaVersion": {SCHEMA_VERSION},',
        f'  "ArtifactName": "{image}",',
        f'  "ArtifactType": "{ARTIFACT_TYPE}",',
        '  "Results": [',
    ]
    result_chunks = []
    for result in document['Results']:
        chunk = ['    {']
        chunk.append(f'      "Target": {json.dumps(result["Target"])},')
        chunk.append(f'      "Class": {json.dumps(result["Class"])},')
        chunk.append(f'      "Type": {json.dumps(result["Type"])},')
        packages = result.get('Packages') or []
        chunk.append('      "Packages": [')
        chunk.extend(
            '        '
            + json.dumps(package, separators=(', ', ': '))
            + (',' if index < len(packages) - 1 else '')
            for index, package in enumerate(packages)
        )
        chunk.append('      ],')
        vulnerabilities = result.get('Vulnerabilities') or []
        chunk.append('      "Vulnerabilities": [')
        chunk.extend(
            '        '
            + json.dumps(vulnerability, separators=(', ', ': '))
            + (',' if index < len(vulnerabilities) - 1 else '')
            for index, vulnerability in enumerate(vulnerabilities)
        )
        chunk.append('      ]')
        chunk.append('    }')
        result_chunks.append('\n'.join(chunk))
    lines.append(',\n'.join(result_chunks))
    lines.append('  ]')
    lines.append('}')
    (ROOT / f'{name(image)}.json').write_text('\n'.join(lines) + '\n', encoding='utf-8')


def os_package(
    pkg_name: str, version: str, release: str = DEFAULT_RELEASE
) -> dict[str, str]:
    """Build a Trivy OS package record for `pkg_name` at `version`."""
    return {
        'ID': f'{pkg_name}@{version}',
        'Name': pkg_name,
        'Version': version,
        'Release': release,
    }


def vulnerability(
    vuln_id: str,
    pkg: str,
    installed: str,
    fixed: str | None,
    severity: str,
    title: str,
) -> dict[str, str]:
    """Build a Trivy vulnerability record, omitting `FixedVersion` when unfixed."""
    entry = {
        'VulnerabilityID': vuln_id,
        'PkgName': pkg,
        'InstalledVersion': installed,
        'Severity': severity,
        'Title': title,
    }
    if fixed:
        entry['FixedVersion'] = fixed
    return entry


def simple(
    image: str,
    target: str,
    os_type: str,
    packages: list[tuple[str, str]],
    vulns: list[dict[str, str]],
) -> dict[str, Any]:
    """Build a single-target, OS-package-only Trivy scan document."""
    return {
        'SchemaVersion': SCHEMA_VERSION,
        'ArtifactName': image,
        'ArtifactType': ARTIFACT_TYPE,
        'Results': [
            {
                'Target': target,
                'Class': OS_PKGS_CLASS,
                'Type': os_type,
                'Packages': [os_package(*package) for package in packages],
                'Vulnerabilities': vulns,
            }
        ],
    }


def main() -> None:
    """Regenerate every hermetic scanner fixture under `ROOT` from scratch."""
    ROOT.mkdir(parents=True, exist_ok=True)
    for existing in ROOT.glob('*.json'):
        existing.unlink()

    app = 'registry.example.com/app:1.2.3'
    write(
        app,
        simple(
            app,
            f'{app} (alpine 3.20.2)',
            'alpine',
            [('busybox', '1.36.1'), ('musl', '1.2.5'), ('zlib', '1.3.1')],
            [
                vulnerability(
                    'CVE-2024-30001',
                    'zlib',
                    '1.3.1',
                    '1.3.2',
                    'MEDIUM',
                    'zlib: heap overflow in inflate',
                )
            ],
        ),
    )

    ok = 'registry.example.com/app/ok:1.0.0'
    write(
        ok,
        simple(
            ok,
            f'{ok} (alpine 3.20.2)',
            'alpine',
            [('busybox', '1.36.1'), ('musl', '1.2.5')],
            [
                vulnerability(
                    'CVE-2024-30002',
                    'busybox',
                    '1.36.1',
                    '1.36.2',
                    'LOW',
                    'busybox: minor parsing issue',
                )
            ],
        ),
    )

    api = 'registry.example.com/payments/api@sha256:8f2c4ad4bb6ec2a1e0f2c8e2f3f2d1b0a9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4'
    write(
        api,
        {
            'SchemaVersion': 2,
            'ArtifactName': api,
            'ArtifactType': 'container_image',
            'Results': [
                {
                    'Target': f'{api} (debian 12.6)',
                    'Class': 'os-pkgs',
                    'Type': 'debian',
                    'Packages': [
                        os_package('libssl3', '3.0.13-1'),
                        os_package('libc6', '2.36-9'),
                    ],
                    'Vulnerabilities': [
                        vulnerability(
                            'CVE-2024-2511',
                            'libssl3',
                            '3.0.13-1',
                            '3.0.14-1',
                            'HIGH',
                            'openssl: unbounded memory growth',
                        ),
                    ],
                },
                {
                    'Target': 'app/package-lock.json',
                    'Class': 'lang-pkgs',
                    'Type': 'npm',
                    'Packages': [
                        {
                            'ID': 'fastify@4.26.0',
                            'Name': 'fastify',
                            'Version': '4.26.0',
                        },
                        {'ID': 'pino@8.19.0', 'Name': 'pino', 'Version': '8.19.0'},
                    ],
                    'Vulnerabilities': [],
                },
            ],
        },
    )

    worker = 'registry.example.com/payments/worker:2.7.1'
    write(
        worker,
        simple(
            worker,
            f'{worker} (debian 12.6)',
            'debian',
            [('libc6', '2.36-9'), ('libgcrypt20', '1.10.1-3')],
            [
                vulnerability(
                    'CVE-2024-2236',
                    'libgcrypt20',
                    '1.10.1-3',
                    None,
                    'MEDIUM',
                    'libgcrypt: timing side channel',
                )
            ],
        ),
    )

    web = 'registry.example.com/checkout/web:9.9.9'
    write(
        web, simple(web, f'{web} (alpine 3.20.2)', 'alpine', [('nginx', '1.26.1')], [])
    )

    proxy = 'registry.k8s.io/kube-proxy:v1.30.2'
    write(
        proxy,
        simple(
            proxy, f'{proxy} (debian 12.6)', 'debian', [('iptables', '1.8.9-2')], []
        ),
    )

    coverage = 'registry.example.com/coverage/app:1.0.0'
    write(
        coverage,
        {
            'SchemaVersion': 2,
            'ArtifactName': coverage,
            'ArtifactType': 'container_image',
            'Results': [
                {
                    'Target': f'{coverage} (alpine 3.20.2)',
                    'Class': 'os-pkgs',
                    'Type': 'alpine',
                    'Packages': [os_package('busybox', '1.36.1')],
                    'Vulnerabilities': [],
                },
                {
                    'Target': 'app/package-lock.json',
                    'Class': 'lang-pkgs',
                    'Type': 'npm',
                    'Packages': [
                        {
                            'ID': 'lodash@4.17.20',
                            'Name': 'lodash',
                            'Version': '4.17.20',
                            'FilePath': 'app/package-lock.json',
                        },
                        {
                            'ID': 'express@4.18.2',
                            'Name': 'express',
                            'Version': '4.18.2',
                            'FilePath': 'app/package-lock.json',
                        },
                    ],
                    'Vulnerabilities': [
                        {
                            'VulnerabilityID': 'CVE-2021-23337',
                            'PkgName': 'lodash',
                            'PkgPath': 'app/package-lock.json',
                            'InstalledVersion': '4.17.20',
                            'FixedVersion': '4.17.21',
                            'Severity': 'HIGH',
                            'Title': 'nodejs-lodash: command injection via template',
                        }
                    ],
                    'ExperimentalModifiedFindings': [
                        {
                            'Type': 'vulnerability',
                            'Status': 'not_affected',
                            'Statement': 'vulnerable_code_not_in_execute_path',
                            'Source': 'fixture.vex',
                            'Finding': {
                                'VulnerabilityID': 'CVE-2020-7598',
                                'PkgName': 'minimist',
                                'PkgPath': 'app/package-lock.json',
                                'InstalledVersion': '1.2.0',
                                'FixedVersion': '1.2.2',
                                'Severity': 'CRITICAL',
                                'Title': 'nodejs-minimist: prototype pollution',
                            },
                        }
                    ],
                },
            ],
        },
    )

    base = 'registry.example.com/platform/base:3.1.0'
    packages = [
        os_package(f'lib{chr(ord("a") + index % 26)}{index}', f'1.{index}.0')
        for index in range(40)
    ]
    vulns = [
        vulnerability(
            'CVE-2025-10001',
            'libssl3',
            '3.0.11-1',
            '3.0.14-1',
            'CRITICAL',
            'openssl: remote code execution',
        ),
        vulnerability(
            'CVE-2025-10002',
            'zlib',
            '1.2.13',
            '1.3.1',
            'CRITICAL',
            'zlib: heap corruption',
        ),
        vulnerability(
            'CVE-2025-20001',
            'libxml2',
            '2.9.14',
            '2.12.7',
            'HIGH',
            'libxml2: use after free',
        ),
        vulnerability(
            'CVE-2025-20002',
            'curl',
            '8.4.0',
            '8.8.0',
            'HIGH',
            'curl: credential leak on redirect',
        ),
        vulnerability(
            'CVE-2025-20003',
            'libtasn1',
            '4.19.0',
            None,
            'HIGH',
            'libtasn1: out-of-bounds read',
        ),
        vulnerability(
            'CVE-2025-20004',
            'perl',
            '5.36.0',
            '5.38.2',
            'HIGH',
            'perl: integer overflow',
        ),
        vulnerability(
            'CVE-2025-20005',
            'sqlite3',
            '3.40.1',
            '3.45.3',
            'HIGH',
            'sqlite: denial of service',
        ),
    ]
    vulns += [
        vulnerability(
            f'CVE-2025-3{index:04d}',
            packages[index % len(packages)]['Name'],
            packages[index % len(packages)]['Version'],
            None,
            'MEDIUM',
            'medium severity issue',
        )
        for index in range(12)
    ]
    vulns += [
        vulnerability(
            f'CVE-2025-4{index:04d}',
            packages[index % len(packages)]['Name'],
            packages[index % len(packages)]['Version'],
            None,
            'LOW',
            'low severity issue',
        )
        for index in range(240)
    ]
    packages.extend(
        [
            os_package('libssl3', '3.0.11-1'),
            os_package('zlib', '1.2.13'),
            os_package('libxml2', '2.9.14'),
            os_package('curl', '8.4.0'),
            os_package('libtasn1', '4.19.0'),
            os_package('perl', '5.36.0'),
            os_package('sqlite3', '3.40.1'),
        ]
    )
    write_dense(
        base,
        {
            'Results': [
                {
                    'Target': f'{base} (debian 12.6)',
                    'Class': 'os-pkgs',
                    'Type': 'debian',
                    'Packages': packages,
                    'Vulnerabilities': vulns,
                }
            ]
        },
    )

    print(f'wrote {len(list(ROOT.glob("*.json")))} image fixtures')


if __name__ == '__main__':
    main()
