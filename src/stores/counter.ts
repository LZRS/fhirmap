import { defineStore } from "pinia";

export const useCounterStore = defineStore({
  id: "counter",
  state: () => ({
    counter: 0,
  }),
  getters: {
    doubleCount: (state) => state.counter * 2,
  },
  actions: {
    increment() {
      this.counter++;
    },
  },
});

export const useMappingStore = defineStore("mappings", {
  state: () => ({
    mapFileTemplate: `
map "http://fhir.labs.smartregister.org/fhir/StructureMap/{unique-identifier}" = "{humanReadableName}"

uses "http://hl7.org/fhir/StructureDefinition/QuestionnaireResponse" as source
uses "http://hl7.org/fhir/StructureDefinition/Bundle" as target
uses "http://hl7.org/fhir/StructureDefinition/Encounter" as target
uses "http://hl7.org/fhir/StructureDefinition/Observation" as target

group extract{unique-identifier-camelCased}(source src: QuestionnaireResponse, target bundle: Bundle)
    {
        src -> bundle.id = uuid() "rule_uuid";
        src -> bundle.type = "collection" "rule_type";
        src -> bundle.entry as entry,
                entry.resource = create("Encounter") as encounter then
                    extractEncounter(src, encounter){extract-observations-calls} "rule_entry";
    }
    `
  })
})
