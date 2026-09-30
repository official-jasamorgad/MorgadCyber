import Image from 'next/image'
import Link from 'next/link'
import logo from '../../../../assets/icons/file_0000000037a0720bb851249d9c21dcf7.png'

export default function BrandLogo() {
  return (
    <Link href="/" aria-label="J.S. Morgad Cyber" style={{ display: 'inline-flex', alignItems: 'center' }}>
      <Image src={logo} alt="J.S. Morgad Cyber" width={150} height={72} style={{ width: 150, height: 52, objectFit: 'contain' }} priority />
    </Link>
  )
}