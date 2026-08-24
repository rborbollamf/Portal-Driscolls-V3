export function canAccessProducerResource(
  userRole: string,
  associatedProducerId: string | undefined,
  resourceProducerId: string,
) {
  return userRole !== "PRODUCER" || associatedProducerId === resourceProducerId;
}