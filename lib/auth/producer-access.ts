export const PRODUCER_ASSOCIATION_REQUIRED_CODE =
  "producer_association_required";
export const PRODUCER_ASSOCIATION_REQUIRED_MESSAGE =
  "Tu cuenta de productor aún no está vinculada a un expediente. Solicita a administración que complete el vínculo.";
export const PRODUCER_ASSOCIATION_REQUIRED_REDIRECT =
  `/login?error=${PRODUCER_ASSOCIATION_REQUIRED_CODE}`;

export function getProducerAssociationLoginError(errorCode: string | null) {
  return errorCode === PRODUCER_ASSOCIATION_REQUIRED_CODE
    ? PRODUCER_ASSOCIATION_REQUIRED_MESSAGE
    : "";
}

export function canAccessProducerResource(
  userRole: string,
  associatedProducerId: string | undefined,
  resourceProducerId: string,
) {
  return userRole !== "PRODUCER" || associatedProducerId === resourceProducerId;
}