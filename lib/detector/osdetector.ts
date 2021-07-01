import { arch, hostname, type } from 'os';
import { Detector, Resource, ResourceDetectionConfig } from '@opentelemetry/resources';
import { HostArchValues, OsTypeValues, ResourceAttributes } from '@opentelemetry/semantic-conventions';

class OSDetector implements Detector {
    // eslint-disable-next-line class-methods-use-this
    public detect(_config: ResourceDetectionConfig): Promise<Resource> {
        const attrs = {
            [ResourceAttributes.HOST_NAME]: hostname(),
            [ResourceAttributes.HOST_ARCH]: OSDetector.mapArchitecture(arch()),
            [ResourceAttributes.OS_TYPE]: OSDetector.mapOSType(type()),
        };

        return Promise.resolve(new Resource(attrs));
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

export const osDetector: Detector = new OSDetector();
