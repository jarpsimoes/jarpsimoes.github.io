import {CertificationName} from './certification-name';

export interface CertificationEntity {
    vendor: string
    image: string
    certificates: CertificationName[]
}
