// Member data storage
// 選手・優先・除外をiPhoneのブラウザに自動保存し、3つのプリセットを使えます。
const STORAGE_KEY = 'ultimate-member-selection-members-v3';
const PRESET_KEY = 'ultimate-member-selection-presets-v1';
const ACTIVE_PRESET_KEY = 'ultimate-member-selection-active-preset-v1';
const PRESET_COUNT = 3;

function readJson(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return fallback;
    const parsed = JSON.parse(saved);
    return parsed ?? fallback;
  } catch (e) {
    return fallback;
  }
}

function loadPresets() {
  const parsed = readJson(PRESET_KEY, []);
  return Array.from({ length: PRESET_COUNT }, (_, i) =>
    Array.isArray(parsed[i]) ? parsed[i] : []
  );
}

function savePresets(presets) {
  localStorage.setItem(PRESET_KEY, JSON.stringify(presets));
}

let activePreset = Math.max(
  0,
  Math.min(PRESET_COUNT - 1, Number(localStorage.getItem(ACTIVE_PRESET_KEY) || 0))
);

let members = (() => {
  const presets = loadPresets();

  // 既存の保存方式がある場合は、それをプリセット1へ引き継ぐ。
  if (!presets.some(p => p.length)) {
    const old = readJson(STORAGE_KEY, null);
    if (Array.isArray(old) && old.length) {
      presets[0] = old;
      savePresets(presets);
    }
  }

  return JSON.parse(JSON.stringify(presets[activePreset] || []));
})();

function saveMembers() {
  const presets = loadPresets();
  presets[activePreset] = JSON.parse(JSON.stringify(members));
  savePresets(presets);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
  localStorage.setItem(ACTIVE_PRESET_KEY, String(activePreset));
}

function loadPreset(index) {
  saveMembers();
  const presets = loadPresets();
  activePreset = index;
  members = JSON.parse(JSON.stringify(presets[index] || []));
  localStorage.setItem(ACTIVE_PRESET_KEY, String(activePreset));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
  renderMemberList();
  resultDiv.innerHTML = '';
  updatePresetButtons();
}

function updatePresetButtons() {
  document.querySelectorAll('.preset-btn').forEach((btn, i) => {
    btn.classList.toggle('active', i === activePreset);
  });
}

const nameInput = document.getElementById('nameInput');
const primaryCheckboxes = document.querySelectorAll('.primary-checkbox');
const extraCheckboxes = document.querySelectorAll('.extra-checkbox');
const addBtn = document.getElementById('addBtn');
const memberList = document.getElementById('memberList');
const selectBtn = document.getElementById('selectBtn');
const resultDiv = document.getElementById('result');

const PRIMARY_LABEL = {
  hand: 'ハンド',
  middle: 'ミドル',
  deep: 'ディープ'
};

const ALL_EXTRA_POS = [
  'ハメカップ', 'ショーD', 'スト',
  'アンハメカップ', 'ハメサイミ', 'アンハメサイミ', 'DD'
];

const REQUIRED = { hand: 3, middle: 2, deep: 2 };
const TEAM_SIZE = 7;

function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

addBtn.addEventListener('click', addMember);

nameInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') addMember();
});

function addMember() {
  const name = nameInput.value.trim();
  if (!name) {
    alert('名前を入力してください');
    nameInput.focus();
    return;
  }

  const selectedPrimaries = [...primaryCheckboxes]
    .filter(cb => cb.checked)
    .map(cb => cb.value);

  if (selectedPrimaries.length === 0) {
    alert('主ポジションを最低1つ選択してください');
    return;
  }

  const selectedExtras = [...extraCheckboxes]
    .filter(cb => cb.checked)
    .map(cb => cb.value);

  if (selectedExtras.length > 3) {
    alert('追加ポジションは最大3つまで選択できます');
    return;
  }

  members.push({
    name,
    primaryPositions: selectedPrimaries,
    extraPositions: selectedExtras,
    priority: false,
    exclude: false
  });

  nameInput.value = '';
  primaryCheckboxes.forEach(cb => cb.checked = false);
  extraCheckboxes.forEach(cb => cb.checked = false);

  saveMembers();
  renderMemberList();
  nameInput.focus();
}

function deleteMember(index) {
  members.splice(index, 1);
  saveMembers();
  renderMemberList();
  resultDiv.innerHTML = '';
}

function toggleExclude(index, checked) {
  members[index].exclude = checked;
  if (checked) members[index].priority = false;
  saveMembers();
  renderMemberList();
}

function togglePriority(index, checked) {
  if (members[index].exclude && checked) return;
  members[index].priority = checked;
  saveMembers();
  renderMemberList();
}

function renderMemberList() {
  memberList.innerHTML = '';

  members.forEach((m, i) => {
    const tr = document.createElement('tr');

    const tdExclude = document.createElement('td');
    const exclCb = document.createElement('input');
    exclCb.type = 'checkbox';
    exclCb.checked = m.exclude;
    exclCb.setAttribute('aria-label', `${m.name}を除外`);
    exclCb.addEventListener('change', e => toggleExclude(i, e.target.checked));
    tdExclude.appendChild(exclCb);

    const tdPriority = document.createElement('td');
    const priCb = document.createElement('input');
    priCb.type = 'checkbox';
    priCb.checked = m.priority;
    priCb.disabled = m.exclude;
    priCb.setAttribute('aria-label', `${m.name}を優先`);
    priCb.addEventListener('change', e => togglePriority(i, e.target.checked));
    tdPriority.appendChild(priCb);

    const tdName = document.createElement('td');
    tdName.textContent = m.name;

    const tdPrim = document.createElement('td');
    tdPrim.textContent = m.primaryPositions.map(p => PRIMARY_LABEL[p]).join('、');

    const tdExtra = document.createElement('td');
    tdExtra.textContent = m.extraPositions.length
      ? m.extraPositions.join('、')
      : '—';

    const tdAction = document.createElement('td');
    const delBtn = document.createElement('button');
    delBtn.textContent = '削除';
    delBtn.className = 'delete-btn';
    delBtn.addEventListener('click', () => deleteMember(i));
    tdAction.appendChild(delBtn);

    tr.append(tdExclude, tdPriority, tdName, tdPrim, tdExtra, tdAction);
    memberList.appendChild(tr);
  });
}

function findSolutions(maxSolutions = 3) {
  const candidates = members.filter(m => !m.exclude);
  const priorityMembers = candidates.filter(m => m.priority);

  if (priorityMembers.length > TEAM_SIZE) return [];

  const prioritySet = new Set(priorityMembers);
  const orderedCandidates = [
    ...shuffle(candidates.filter(m => prioritySet.has(m))),
    ...shuffle(candidates.filter(m => !prioritySet.has(m)))
  ];

  const solutions = [];
  const solutionKeys = new Set();

  function backtrack(idx, selected, usedExtras, counts) {
    if (solutions.length >= 60) return;

    if (selected.length === TEAM_SIZE) {
      if (
        counts.hand !== REQUIRED.hand ||
        counts.middle !== REQUIRED.middle ||
        counts.deep !== REQUIRED.deep ||
        usedExtras.size !== ALL_EXTRA_POS.length
      ) return;

      const selectedSet = new Set(selected.map(x => x.member));
      if (!priorityMembers.every(m => selectedSet.has(m))) return;

      const memberKey = selected.map(x => x.member.name).sort().join('|');
      if (solutionKeys.has(memberKey)) return;

      solutionKeys.add(memberKey);
      solutions.push([...selected]);
      return;
    }

    if (idx >= orderedCandidates.length) return;

    const remainingSlots = TEAM_SIZE - selected.length;
    if (orderedCandidates.length - idx < remainingSlots) return;

    const member = orderedCandidates[idx];

    // 優先メンバーは必ず選ぶ。通常メンバーだけスキップ可能。
    if (!member.priority) {
      backtrack(idx + 1, selected, usedExtras, counts);
    }

    const possibleExtras = shuffle(
      member.extraPositions.filter(ep => !usedExtras.has(ep))
    );

    const possiblePrimaries = shuffle(
      member.primaryPositions.filter(p => counts[p] < REQUIRED[p])
    );

    if (!possibleExtras.length || !possiblePrimaries.length) return;

    for (const extra of possibleExtras) {
      for (const primary of possiblePrimaries) {
        const newCounts = {
          ...counts,
          [primary]: counts[primary] + 1
        };

        const newUsedExtras = new Set(usedExtras);
        newUsedExtras.add(extra);

        backtrack(
          idx + 1,
          selected.concat({
            member,
            assignedPrimary: primary,
            assignedExtra: extra
          }),
          newUsedExtras,
          newCounts
        );

        if (solutions.length >= 60) return;
      }
    }
  }

  backtrack(0, [], new Set(), { hand: 0, middle: 0, deep: 0 });

  return shuffle(solutions).slice(0, maxSolutions);
}

function displaySolutions(solutions) {
  if (!solutions.length) {
    resultDiv.innerHTML = `
      <div class="no-result">
        条件を満たす組み合わせが見つかりません。
      </div>
    `;
    return;
  }

  const order = { hand: 0, middle: 1, deep: 2 };

  resultDiv.innerHTML = `
    <strong>選出結果（最大3通り）</strong>
    ${solutions.map((sol, idx) => {
      const ordered = [...sol].sort(
        (a, b) => order[a.assignedPrimary] - order[b.assignedPrimary]
      );

      const items = ordered.map(s => `
        <li>
          <span class="result-name">${escapeHtml(s.member.name)}</span>
          ${s.member.priority ? '<span class="priority-mark">★優先</span>' : ''}
          <span>${PRIMARY_LABEL[s.assignedPrimary]} — ${escapeHtml(s.assignedExtra)}</span>
        </li>
      `).join('');

      return `
        <div class="solution">
          <strong>候補 ${idx + 1}</strong>
          <ul>${items}</ul>
        </div>
      `;
    }).join('')}
  `;
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value;
  return div.innerHTML;
}

selectBtn.addEventListener('click', () => {
  const activeMembers = members.filter(m => !m.exclude);
  const priorityMembers = activeMembers.filter(m => m.priority);

  if (priorityMembers.length > TEAM_SIZE) {
    resultDiv.innerHTML = `
      <div class="no-result">
        優先メンバーが7人を超えているため、7人を選出できません。
      </div>
    `;
    return;
  }

  const invalidPriority = priorityMembers.find(
    m => m.extraPositions.length === 0
  );

  if (invalidPriority) {
    resultDiv.innerHTML = `
      <div class="no-result">
        優先メンバー「${escapeHtml(invalidPriority.name)}」に
        追加ポジションが登録されていません。
        優先メンバーは必ず選出されるため、
        追加ポジションを1つ以上設定してください。
      </div>
    `;
    return;
  }

  if (activeMembers.length < TEAM_SIZE) {
    resultDiv.innerHTML = `
      <div class="no-result">
        選出可能なメンバーが7人未満です。
      </div>
    `;
    return;
  }

  displaySolutions(findSolutions(3));
});

document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => loadPreset(Number(btn.dataset.preset)));
});

renderMemberList();
updatePresetButtons();
