export const titleCase = (s: string) =>
  s
    .replace(/^[-_]*(.)/, (_, c) => c.toUpperCase()) // Initial char (after -/_)
    .replace(/[-_ ]+(.)/g, (_, c) => c.toUpperCase()); // First char after each -/_

export const snakeCase = (s: string) => s.replace(/[- ]/g, "_");

export const extractedSingle = (linkId: string, val: Record<string, any>) => {
  if ("valueDecimal" in val) {
    return `create("Quantity") as qty then 
                {
                    src -> qty.value = evaluate(src, $this.item.where(linkId = ${linkId}).answer.value) "r_${snakeCase(
      linkId
    )}_value_1";
                    src -> qty.system = copy("http://unitsofmeasure.org") "r_${snakeCase(
                      linkId
                    )}_value_2";
                    
                    // TODO: get measurement units
                    src -> qty.code = "" "r_${snakeCase(linkId)}_value_3";
                    src -> qty.unit = "" "r_${snakeCase(linkId)}_value_4";
                }`;
  } else if ("valueCoding" in val) {
    return `create("CodeableConcept") as valCodeableConcept then 
    {
        src -> valCodeableConcept.coding = evaluate(src, $this.item.where(linkId = ${linkId}).answer.value) "r_${snakeCase(
      linkId
    )}_value_1";
    }`;
  } else if (
    [
      "valueBoolean",
      "valueInteger",
      "valueString",
      "valueQuantity",
      "valueDateTime",
      "valueTime",
    ].some((v) => v in val)
  ) {
    return `evaluate(src, $this.item.where(linkId = "${linkId}").answer.value)`;
  } else {
    const [key] = Object.keys(val);
    throw `Value type '${key}' not currently handled`;
  }
};

export const observationValue = (item: {
  linkId: string;
  answer: Array<Record<string, any>>;
}) => {
  if (item.answer.length == 1) {
    const [val] = item.answer;
    return extractedSingle(item.linkId, val);
  } else {
    return `create("CodeableConcept") as multipleValCodeableConcept then 
                {
                    src.item as item where $this.linkId="${
                      item.linkId
                    }" -> multipleValCodeableConcept then 
                        {
                            item.answer as codingAnswer where $this.value is Coding -> multipleValCodeableConcept then 
                                {
                                    codingAnswer.value as itemValue -> multipleValCodeableConcept.coding = itemValue "r_${snakeCase(
                                      item.linkId
                                    )}_value_1_1_1";
                                } "r_${snakeCase(item.linkId)}_value_1_1";
                
                            item.answer as textAnswer where $this.value is string -> multipleValCodeableConcept then 
                                {
                                    textAnswer.value as itemValue -> multipleValCodeableConcept.text = itemValue "r_${snakeCase(
                                      item.linkId
                                    )}_value_1_2_1";
                                } "r_${snakeCase(item.linkId)}_value_1_2";
                        } "r_${snakeCase(item.linkId)}_value_1";
                }`;
  }
};

export const createObservation = (item: {
  linkId: string;
  answer: Array<Record<string, any>>;
}) => {
  const groupMethod = `
group extract${titleCase(
    item.linkId
  )}Observation(source src: QuestionnaireResponse, target encounter: Encounter, target bundle: Bundle)
    {
        src -> bundle.entry as entry, entry.resource = create("Observation") as obs then 
                    {
                        src -> obs.id = uuid() "r_${snakeCase(
                          item.linkId
                        )}_uuid";
                        src -> obs.code = create("CodeableConcept") as codeableConcept then 
                                {
                                    /* TODO => Get actual coding */
                                    src -> codeableConcept.coding = c("http://d-tree.org", "${
                                      item.linkId
                                    }") "r_${snakeCase(item.linkId)}_code_1";
                                } "r_${snakeCase(item.linkId)}_code";
                                
                        src -> obs.value = ${observationValue(
                          item
                        )} "r_${snakeCase(item.linkId)}_value";
                        
                        src -> obs.subject = create("Reference") as reference then 
                                {
                                    src -> reference.reference = evaluate(src, "Patient/" + $this.item.where(linkId = "patient-id").answer.value) "r_${snakeCase(
                                      item.linkId
                                    )}_subject_1";
                                } "r_${snakeCase(item.linkId)}_subject";
                        src -> obs.encounter = reference(encounter) "r_${
      snakeCase(item.linkId)
                        }_encounter";
                        src -> obs.category = cc("http://terminology.hl7.org/CodeSystem/observation-category", 'vital-signs', "Vital Signs") "r_${
      snakeCase(item.linkId)
                        }_category";
                        src -> obs.effective = evaluate(src, now()) "r_${
      snakeCase(item.linkId)
                        }_effective";
                    } "r_${snakeCase(item.linkId)}";
    }
    `;
  const groupMethodExecName = `extract${titleCase(
    item.linkId
  )}Observation(src, encounter, bundle)`;

  return [groupMethod, groupMethodExecName];
};

export const createMap = (
  nameIdentifier: string,
  questionnaireResponse: {
    item: Array<{ linkId: string; answer: Array<Record<string, any>> }>;
  }
) => {
  const observations = questionnaireResponse.item
    .filter((elem) => elem.answer)
    .filter((elem) => elem.linkId !== "patient-id")
    .map(createObservation);

  const observationGroups = observations.map((elem) => elem[0]);

  const createObservationCalls = observations.map((elem) => elem[1]);

  return `
map "http://fhir.labs.smartregister.org/fhir/StructureMap/${nameIdentifier}" = "${titleCase(
    nameIdentifier
  )} Map"

uses "http://hl7.org/fhir/StructureDefinition/QuestionnaireResponse" as source
uses "http://hl7.org/fhir/StructureDefinition/Bundle" as target
uses "http://hl7.org/fhir/StructureDefinition/Encounter" as target
uses "http://hl7.org/fhir/StructureDefinition/Observation" as target

group extract${titleCase(
    nameIdentifier
  )}(source src: QuestionnaireResponse, target bundle: Bundle)
    {
        src -> bundle.id = uuid() "rule_uuid";
        src -> bundle.type = "collection" "rule_type";
        src -> bundle.entry as entry,
                entry.resource = create("Encounter") as encounter then
                    extractEncounter(src, encounter)${
                      createObservationCalls.length > 0 ? ", " : ""
                    }${createObservationCalls.join(", ")} "rule_entry";
    }
    
group extractEncounter(source src: QuestionnaireResponse, target encounter: Encounter)
    {
        src -> encounter.id = uuid() "r_encounter_uuid";
        src -> encounter.status = copy("finished") "r_encounter_status";
        src -> encounter.class = c("http://terminology.hl7.org/CodeSystem/v3-ActCode", "AMB", "ambulatory")
                                 "r_encounter_class";
        src -> encounter.serviceType = cc("http://terminology.hl7.org/CodeSystem/service-type", "335", "Facility")
                                 "r_encounter_serviceType";
    }
${observationGroups.join("\n")}
`.trim();
};
