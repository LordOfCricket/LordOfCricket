import { getPartners, uploadPartner, deletePartner } from '../services/partners.js'

export { getPartners, uploadPartner, deletePartner }

export function nextSortOrder(partners) {
  return partners.length + 1
}
