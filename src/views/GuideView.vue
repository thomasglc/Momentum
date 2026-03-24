<template>
  <div class="px-4 py-4 pb-6 flex flex-col gap-5">

    <!-- Format Duo -->
    <section>
      <h2 class="text-base font-bold text-gray-800 mb-2">Format Hyrox Doubles</h2>
      <div class="bg-slate-800 rounded-xl p-4 text-white">
        <p class="text-2xl font-black text-orange-400 leading-none">{{ guide.duoFormat.targetTime }}</p>
        <p class="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5 mb-3">Objectif de temps</p>
        <div class="flex gap-2 mb-4">
          <div
            v-for="b in guide.duoFormat.breakdown"
            :key="b.label"
            class="flex-1 bg-white/10 rounded-lg p-2 text-center"
          >
            <p class="text-sm font-bold text-orange-400">{{ b.value }}</p>
            <p class="text-[10px] text-gray-400 leading-tight mt-0.5">{{ b.label }}</p>
          </div>
        </div>
        <ul class="flex flex-col gap-1.5">
          <li
            v-for="rule in guide.duoFormat.rules"
            :key="rule"
            class="flex gap-2 text-xs text-gray-300"
          >
            <span class="text-orange-400 flex-shrink-0 mt-0.5">▸</span>
            <span>{{ rule }}</span>
          </li>
        </ul>
      </div>
    </section>

    <!-- Allures de référence -->
    <section>
      <h2 class="text-base font-bold text-gray-800 mb-2">Allures de Référence</h2>
      <div class="flex flex-col gap-3">
        <div
          v-for="person in [guide.paces.lui, guide.paces.elle]"
          :key="person.name"
          class="bg-white rounded-xl shadow-sm p-4"
        >
          <div class="flex items-center gap-2 mb-1">
            <p class="font-bold text-gray-800">{{ person.name }}</p>
            <span class="text-xl font-black text-orange-500">{{ person.semiTime }}</span>
            <span class="text-xs text-gray-400">semi · {{ person.semipace }}</span>
          </div>
          <p class="text-xs text-gray-500 mb-3 leading-relaxed">{{ person.priority }}</p>

          <!-- Table zones -->
          <table class="w-full text-xs mb-3">
            <thead>
              <tr class="text-gray-400">
                <th class="pb-1.5 font-semibold text-left w-8">Zone</th>
                <th class="pb-1.5 font-semibold text-left">Type</th>
                <th class="pb-1.5 font-semibold text-right">Allure /km</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="z in person.zones"
                :key="z.zone"
                class="border-t border-gray-100"
              >
                <td class="py-1.5 font-bold text-blue-500">{{ z.zone }}</td>
                <td class="py-1.5 text-gray-600">{{ z.desc }}</td>
                <td class="py-1.5 text-right font-semibold text-gray-800">{{ z.pace }}</td>
              </tr>
            </tbody>
          </table>

          <div class="bg-blue-50 rounded-lg px-3 py-2">
            <p class="text-xs text-blue-700"><strong>Allure race :</strong> {{ person.raceTarget }}</p>
            <p class="text-xs text-blue-600 mt-0.5">{{ person.note }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Règles de progression -->
    <section>
      <h2 class="text-base font-bold text-gray-800 mb-2">Règles de Progression</h2>
      <div class="flex flex-col gap-2">
        <div class="bg-emerald-50 rounded-xl p-4">
          <p class="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-2">✅ Quand monter en charge</p>
          <ul class="flex flex-col gap-1.5">
            <li
              v-for="r in guide.progressionRules.increase"
              :key="r"
              class="flex gap-2 text-xs text-emerald-800"
            >
              <span class="flex-shrink-0">▸</span><span>{{ r }}</span>
            </li>
          </ul>
        </div>
        <div class="bg-red-50 rounded-xl p-4">
          <p class="text-[10px] font-bold text-red-600 uppercase tracking-widest mb-2">⛔ Quand ne pas monter</p>
          <ul class="flex flex-col gap-1.5">
            <li
              v-for="r in guide.progressionRules.noIncrease"
              :key="r"
              class="flex gap-2 text-xs text-red-800"
            >
              <span class="flex-shrink-0">▸</span><span>{{ r }}</span>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- Mobilité -->
    <section>
      <h2 class="text-base font-bold text-gray-800 mb-1">Séance Mobilité</h2>
      <p class="text-xs text-gray-500 mb-2">{{ guide.mobility.duration }} · {{ guide.mobility.when }}</p>
      <div class="flex flex-col gap-2">
        <div
          v-for="s in guide.mobility.sections"
          :key="s.title"
          class="bg-white rounded-xl shadow-sm p-4"
        >
          <p class="text-sm font-bold text-gray-800 mb-0.5">{{ s.title }}</p>
          <p class="text-[10px] text-gray-400 mb-2">{{ s.duration }}</p>
          <ul class="flex flex-col gap-1">
            <li
              v-for="ex in s.exercises"
              :key="ex"
              class="flex gap-2 text-xs text-gray-600"
            >
              <span class="text-violet-400 flex-shrink-0">▸</span><span>{{ ex }}</span>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- Race Day -->
    <section>
      <h2 class="text-base font-bold text-gray-800 mb-2">🏁 Semaine Race Day</h2>

      <!-- Calendrier semaine J -->
      <div class="bg-white rounded-xl shadow-sm p-4 mb-2">
        <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Semaine type</p>
        <div class="flex flex-col gap-2">
          <div
            v-for="d in guide.raceDay.week"
            :key="d.day"
            class="flex gap-3 items-start"
          >
            <span class="text-xs font-bold text-orange-500 flex-shrink-0 w-24">{{ d.day }}</span>
            <p class="text-xs text-gray-600">{{ d.content }}</p>
          </div>
        </div>
      </div>

      <!-- Conseils course -->
      <div class="bg-white rounded-xl shadow-sm p-4 mb-2">
        <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Conseils Race Day</p>
        <ul class="flex flex-col gap-1.5">
          <li
            v-for="tip in guide.raceDay.tips"
            :key="tip"
            class="flex gap-2 text-xs text-gray-700"
          >
            <span class="text-orange-400 flex-shrink-0">▸</span><span>{{ tip }}</span>
          </li>
        </ul>
      </div>

      <!-- Nutrition -->
      <div class="bg-emerald-50 rounded-xl p-4">
        <p class="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-2">Nutrition</p>
        <ul class="flex flex-col gap-1.5">
          <li
            v-for="n in guide.raceDay.nutrition"
            :key="n"
            class="flex gap-2 text-xs text-emerald-800"
          >
            <span class="flex-shrink-0">▸</span><span>{{ n }}</span>
          </li>
        </ul>
      </div>
    </section>

  </div>
</template>

<script setup>
import guideData from '@/data/guide.json'
const guide = guideData
</script>
