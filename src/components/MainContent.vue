<template>
  <q-card class="qCard">
    <q-card-section>{{ sourceTitle }}</q-card-section>

    <q-card-section>
      <q-input
        clearable
        clear-icon="close"
        label="Name (Unique Identifier)"
        filled
        v-model="source.uniqueNameIdentifier"
        debounce="500"
        :rules="uniqueNameIdentifierRules"
      />
    </q-card-section>

    <q-card-section>{{ questionnaireResponseTitle }}</q-card-section>
    <q-card-section>
      <q-input
        type="textarea"
        filled
        v-model="source.questionnaireResponse"
        debounce="500"
        :rules="questionnaireResponseRules"
      />
    </q-card-section>
  </q-card>

  <q-card class="qCard">
    <q-card-section>{{ resultMapTitle }}</q-card-section>
    <q-card-section>
      <q-input
        type="textarea"
        filled
        v-model="target.mapText"
        :error="!!target.mappingError"
        :error-message="target.mappingError"
      />
    </q-card-section>
  </q-card>
</template>

<script lang="js">
import {createMap} from "@/service/mappings";

export default {
  name: "MainContent",
  data: () => ({
    source: {
      uniqueNameIdentifier: "",
      questionnaireResponse: "",
    },
    sourceTitle: "Source",
    questionnaireResponseTitle: "QuestionnaireResponse",
    uniqueNameIdentifierRules: [
      val => (val && val.length > 0) || "Unique identifier cannot be Empty"
    ],
    questionnaireResponseRules: [
      val => (val && val.length > 0) || "QuestionnaireResponse cannot be Empty",
      val => (JSON.parse(val).resourceType === "QuestionnaireResponse") || "Not a valid questionnaireResponse"
    ],
    resultMapTitle: "FHIR Mapping Language map (.map)",
    target: {
      mapText: "",
      mappingError: ""
    }
  }),
  methods: {
    generateMap: function (uniqueMapIdentifier, questionnaireResponseObj) {
      return createMap(uniqueMapIdentifier, questionnaireResponseObj);
    },
  },
  watch: {
    source: {
      handler: function (newValue) {
        this.target.mappingError = ""
        if (!newValue.uniqueNameIdentifier || !newValue.questionnaireResponse){
          return;
        }
        const nameNotValid = this.uniqueNameIdentifierRules.some((rule) => typeof rule(newValue.uniqueNameIdentifier) === "string")
        if (nameNotValid) return;
        console.log(newValue);
        const questionnaireResponseNotValid = this.questionnaireResponseRules.some((rule) => typeof rule(newValue.questionnaireResponse) === "string")
        if (questionnaireResponseNotValid) return;
        try {
          this.target.mapText = this.generateMap(newValue.uniqueNameIdentifier, JSON.parse(newValue.questionnaireResponse));
        }catch (e) {
          this.target.mappingError = e;
        }

      },
      deep: true,
      immediate: true
    }
  }
}
</script>

<style lang="scss" scoped>
.qCard {
  margin-bottom: 16px;
}
</style>
