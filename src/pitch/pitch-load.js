/* ADAM/PAGE — src/pitch/pitch-load.js · pitch shell: fetch fragments, pain filter */
/* [plan:2026-09-21_000000-lump-sum-builds.md#phase-6] · gallery-shell pattern for pitch docs. */
// Export map: fetch [data-pitch-docs] in order · inject · init pain filter.
// — Section: fetch + inject —
function pitchLoad(el) {
  var docs = el.dataset.pitchDocs.split(' ');
  var jobs = docs.map(function (d) {
    return fetch(d).then(function (r) { return r.text(); });
  });
  return Promise.all(jobs).then(function (parts) {
    el.innerHTML = parts.join('\n');
  });
}
var pitchMounts = document.querySelectorAll('[data-pitch-docs]');
var pitchJobs = Array.prototype.map.call(pitchMounts, pitchLoad);
Promise.all(pitchJobs).then(function () {
  document.dispatchEvent(new Event('ds:doc'));
  initPitchFilter();
});
// — Section: pain filter (binds after inject — mounts load async) —
function initPitchFilter() {
  var tags = document.querySelectorAll('.filter-tag');
  var rows = document.querySelectorAll('#pain-tbody tr');
  var cards = document.querySelectorAll('#pain-cards .pain-card');
  var countEl = document.getElementById('carousel-count');
  function updateCount() {
    var visible = document.querySelectorAll('#pain-cards .pain-card:not(.hidden)');
    if (countEl) countEl.textContent = visible.length + ' of ' + cards.length + ' pain points';
  }
  tags.forEach(function (tag) {
    tag.addEventListener('click', function () {
      var wasActive = tag.classList.contains('active');
      tags.forEach(function (t) { t.classList.remove('active'); });
      // If clicking an active non-all tag, deselect → reset to all
      var f;
      if (wasActive && tag.dataset.filter !== 'all') {
        f = 'all';
        document.querySelector('.filter-tag[data-filter="all"]').classList.add('active');
      } else {
        tag.classList.add('active');
        f = tag.dataset.filter;
      }
      // Desktop table
      rows.forEach(function (row) {
        row.style.display = (f === 'all' || row.dataset.lever === f) ? '' : 'none';
      });
      // Mobile cards
      cards.forEach(function (card) {
        if (f === 'all' || card.dataset.lever === f) {
          card.classList.remove('hidden');
        } else {
          card.classList.add('hidden');
        }
      });
      // Reset scroll
      var carousel = document.getElementById('pain-cards');
      if (carousel) carousel.scrollLeft = 0;
      updateCount();
    });
  });
  updateCount();
}
