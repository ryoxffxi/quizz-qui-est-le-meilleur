import Paywall from './Paywall'
import DonateModal from './DonateModal'
import LegalModal from './LegalModal'

// Les trois modales lourdes (Dialog + textes légaux) dans UN chunk paresseux,
// monté par App à la première ouverture (voir LazyModals dans App.jsx).
export default function Modals() {
  return (
    <>
      <Paywall />
      <DonateModal />
      <LegalModal />
    </>
  )
}
