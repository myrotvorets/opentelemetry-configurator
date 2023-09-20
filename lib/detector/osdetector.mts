import { arch, hostname, type } from 'node:os';
import { type DetectorSync, type IResource, Resource, type ResourceDetectionConfig } from '@opentelemetry/resources';
import { HostArchValues, OsTypeValues, SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

export class OSDetector implements DetectorSync {
    // eslint-disable-next-line class-methods-use-this
    public detect(_config: ResourceDetectionConfig): IResource {
        const attrs = {
            [SemanticResourceAttributes.HOST_NAME]: hostname(),
            [SemanticResourceAttributes.HOST_ARCH]: OSDetector.mapArchitecture(arch()),
            [SemanticResourceAttributes.OS_TYPE]: OSDetector.mapOSType(type()),
        };

        return new Resource(attrs);
    }

    private static mapArchitecture(architecture: string): string {
        const lut: Record<string, HostArchValues> = {
            arm: HostArchValues.ARM32,
            arm64: HostArchValues.ARM64,
            ia32: HostArchValues.X86,
            ppc: HostArchValues.PPC32,
            ppc64: HostArchValues.PPC64,
            x32: HostArchValues.X86,
            x64: HostArchValues.AMD64,
        };

        return lut[architecture] ?? architecture;
    }

    private static mapOSType(os: string): string {
        const lut: Record<string, OsTypeValues> = {
            AIX: OsTypeValues.AIX,
            Darwin: OsTypeValues.DARWIN,
            DragonFly: OsTypeValues.DRAGONFLYBSD,
            FreeBSD: OsTypeValues.FREEBSD,
            'HP-UX': OsTypeValues.HPUX,
            Linux: OsTypeValues.LINUX,
            NetBSD: OsTypeValues.NETBSD,
            OpenBSD: OsTypeValues.OPENBSD,
            SunOS: OsTypeValues.SOLARIS,
            Windows_NT: OsTypeValues.WINDOWS,
            'OS/390': OsTypeValues.Z_OS,

            'CYGWIN_NT-5.1': OsTypeValues.WINDOWS,
            'CYGWIN_NT-6.1': OsTypeValues.WINDOWS,
            'CYGWIN_NT-6.1-WOW64': OsTypeValues.WINDOWS,
            'CYGWIN_NT-10.0': OsTypeValues.WINDOWS,
        };

        return lut[os] ?? os.replace(/[^a-z0-9]/giu, '').toUpperCase();
    }
}

export const osDetector = new OSDetector();
