(() => {
  "use strict";

  const STORAGE_KEY = "nexa-cyber-lesson-v1";
  const VALID_VIEWS = ["overview", "transfer", "operations", "profile", "lesson"];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const app = document.querySelector("#app");
  const modalRoot = document.querySelector("#modal-root");
  const toast = document.querySelector("#toast");

  const initialState = {
    hacked: false,
    victimBalance: 128450,
    studentBalance: 0,
    phone: "+992 00 000 0000",
    transferComplete: false,
    phished: false,
    phishingLoss: 0,
    lessonComplete: false,
    sound: true,
    transactions: [],
    studentTransactions: [],
  };

  const baseTransactions = [
    { title: "Пополнение счёта", subtitle: "Сегодня, 09:41 · Выполнено", amount: 50000, icon: "trending" },
    { title: "Оплата хостинга", subtitle: "Вчера, 18:24 · Выполнено", amount: -1290, icon: "card" },
    { title: "Подписка на дизайн", subtitle: "Вчера, 12:10 · Выполнено", amount: -2400, icon: "card" },
    { title: "Перевод А. Сафарову", subtitle: "23 ноября, 16:05 · Выполнено", amount: -8000, icon: "send" },
    { title: "Возврат средств", subtitle: "22 ноября, 11:30 · Выполнено", amount: 3500, icon: "refresh" },
  ];

  let state = loadState();
  let currentView = "overview";
  let modalVersion = 0;
  let toastTimer;
  let promoTimer;
  let promoSeconds = 599;
  let pendingTransfer = null;
  let phishingSession = null;
  let audioContext;

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved || typeof saved !== "object") return { ...initialState };
      return {
        ...initialState,
        hacked: saved.hacked === true,
        victimBalance: validBalance(saved.victimBalance, initialState.victimBalance),
        studentBalance: validBalance(saved.studentBalance, 0),
        phone: typeof saved.phone === "string" ? saved.phone.slice(0, 24) : initialState.phone,
        transferComplete: saved.transferComplete === true,
        phished: saved.phished === true,
        phishingLoss: validBalance(saved.phishingLoss, 0),
        lessonComplete: saved.lessonComplete === true,
        sound: saved.sound !== false,
        transactions: Array.isArray(saved.transactions) ? saved.transactions.slice(0, 20) : [],
        studentTransactions: Array.isArray(saved.studentTransactions) ? saved.studentTransactions.slice(0, 20) : [],
      };
    } catch {
      return { ...initialState };
    }
  }

  function validBalance(value, fallback) {
    return Number.isFinite(value) && value >= 0 ? Math.round(value) : fallback;
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function formatMoney(value) {
    return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(Math.abs(value));
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function icon(name, extraClass = "") {
    return `<svg class="icon ${extraClass}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
  }

  function brand(light = false) {
    return `
      <div class="brand ${light ? "brand--light" : ""}">
        <span class="brand__mark">N</span>
        <span><span class="brand__name">NEXA</span><span class="brand__tag">Cyber academy</span></span>
      </div>`;
  }

  function soundButton(extraClass = "") {
    return `
      <button class="icon-button ${extraClass}" type="button" data-action="toggle-sound" aria-label="${state.sound ? "Выключить звук" : "Включить звук"}" title="${state.sound ? "Выключить звук" : "Включить звук"}">
        ${icon(state.sound ? "volume" : "muted")}
      </button>`;
  }

  function navLink(view, label, iconName, badge = "") {
    return `
      <a class="nav-link ${currentView === view ? "active" : ""}" href="#${view}" data-view="${view}">
        ${icon(iconName)}<span>${label}</span>${badge ? `<span class="nav-link__badge">${badge}</span>` : ""}
      </a>`;
  }

  function render() {
    clearInterval(promoTimer);
    if (!state.hacked) {
      app.innerHTML = renderLogin();
      document.title = "NEXA — интерактивный урок кибербезопасности";
      return;
    }

    if (currentView === "lesson" && !state.phished) currentView = "overview";
    const titles = {
      overview: "Панель управления",
      transfer: "Перевод средств",
      operations: "История операций",
      profile: "Мой профиль",
      lesson: "Разбор фишинга",
    };
    const today = new Intl.DateTimeFormat("ru-RU", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(new Date());

    app.innerHTML = `
      <div class="bank-shell">
        <aside class="sidebar">
          ${brand()}
          <p class="sidebar__caption">Управление</p>
          <nav class="sidebar__nav" aria-label="Основная навигация">
            ${navLink("overview", "Обзор", "home")}
            ${navLink("transfer", "Переводы", "send")}
            ${navLink("operations", "Операции", "list")}
            ${navLink("profile", "Мой профиль", "user", state.transferComplete ? "1" : "")}
          </nav>
          <div class="sidebar__bottom">
            <div class="security-mini">
              <div class="security-mini__top">${icon("warning")}Уровень защиты: 32%</div>
              <div class="security-mini__bar"><span></span></div>
              <p>Обнаружен слабый пароль.<br>Это часть учебной миссии.</p>
            </div>
            <div class="admin-card">
              <div class="avatar">АВ</div>
              <div class="admin-card__info"><strong>Александр Волков</strong><span>ADMIN · Демо-доступ</span></div>
              <button class="icon-button admin-card__reset" type="button" data-action="reset-demo" aria-label="Начать заново" title="Начать заново">${icon("refresh")}</button>
            </div>
          </div>
        </aside>
        <section class="dashboard">
          <header class="topbar">
            <div><h2 class="topbar__title">${titles[currentView]}</h2><p class="topbar__date">${today}</p></div>
            <div class="topbar__actions">
              <span class="topbar__admin-label">ADMIN PANEL · DEMO</span>
              ${soundButton()}
              <button class="icon-button notification-dot" type="button" data-action="notification" aria-label="Уведомления">${icon("bell")}</button>
              <div class="avatar">АВ</div>
            </div>
          </header>
          ${renderView()}
        </section>
      </div>
      <nav class="mobile-nav" aria-label="Мобильная навигация">
        ${navLink("overview", "Обзор", "home")}
        ${navLink("transfer", "Переводы", "send")}
        ${navLink("operations", "Операции", "list")}
        ${navLink("profile", "Профиль", "user", state.transferComplete ? "1" : "")}
      </nav>`;

    document.title = `${titles[currentView]} — NEXA Demo`;
    if (currentView === "profile" && !state.phished) startPromoTimer();
  }

  function renderLogin() {
    return `
      <div class="login-page">
        <section class="login-hero">
          ${brand(true)}
          <div class="login-hero__content">
            <p class="eyebrow eyebrow--light">${icon("terminal")}Интерактивная миссия № 01</p>
            <h1>Взломай демо-банк.<br><span>А потом спаси себя.</span></h1>
            <p class="login-hero__description">Узнай, почему слабый пароль — это открытая дверь, а слишком щедрое предложение — повод насторожиться.</p>
            <div class="mission-steps">
              <span class="mission-step"><b>01</b>Подбор пароля</span>
              <span class="mission-step"><b>02</b>Перевод NEX</span>
              <span class="mission-step"><b>03</b>Фишинг</span>
            </div>
          </div>
          <div class="login-hero__footer">${icon("shield")}Безопасная локальная симуляция. Никаких реальных атак и платежей.</div>
        </section>
        <section class="login-panel">
          ${soundButton("sound-button--login")}
          <div class="login-box">
            <div class="login-box__icon">${icon("lock")}</div>
            <h2>Вход в демо-кабинет</h2>
            <p class="login-box__subtitle">Учётная запись администратора уже подготовлена. Запустите учебный подбор пароля.</p>
            <form id="login-form" autocomplete="off">
              <div class="field">
                <label class="field__label" for="login">Логин<span class="field__hint">Демо-аккаунт</span></label>
                <div class="input-wrap">${icon("user")}<input class="input input--mono" id="login" value="admin" readonly /></div>
              </div>
              <div class="field">
                <label class="field__label" for="password">Пароль<span class="field__hint">Слабый пароль</span></label>
                <div class="input-wrap">${icon("lock")}<input class="input input--mono" id="password" type="password" value="admin123" readonly /></div>
              </div>
              <button class="primary-button primary-button--wide" type="submit">${icon("terminal")}Запустить brute-force демо${icon("arrow")}</button>
            </form>
            <p class="login-privacy">${icon("shield")}Скрипт перебирает только заранее записанные слова внутри этой страницы. Он не подключается к другим сайтам.</p>
            <div class="login-box__help"><button class="text-button" type="button" data-action="show-info">Как работает эта симуляция?</button></div>
          </div>
        </section>
      </div>`;
  }

  function renderView() {
    switch (currentView) {
      case "transfer": return renderTransfer();
      case "operations": return renderOperations();
      case "profile": return renderProfile();
      case "lesson": return renderLesson();
      default: return renderOverview();
    }
  }

  function renderOverview() {
    const transactions = [...state.transactions, ...baseTransactions].slice(0, 4);
    return `
      <div class="view">
        <div class="page-heading">
          <div><h1>Добрый день, Александр</h1><p>Вот что происходит с вашими демо-счетами сегодня.</p></div>
          <a class="primary-button" href="#transfer" data-view="transfer">${icon("send")}Новый перевод</a>
        </div>
        <div class="overview-grid">
          <section class="card balance-card">
            <div class="balance-card__top"><span>Основной счёт · Admin</span><span class="balance-card__chip"></span></div>
            <div class="balance-card__amount">${formatMoney(state.victimBalance)}<small>NEX</small></div>
            <p class="balance-card__caption">Доступно для учебных операций</p>
            <div class="balance-card__bottom">
              <div class="balance-card__number"><span>••••</span>4242</div>
              <div class="balance-card__brand">NEXA</div>
            </div>
          </section>
          <section class="card quick-card">
            <div class="card-title-row"><h2>Быстрое действие</h2>${icon("sparkles")}</div>
            <div class="quick-card__icon">${icon("phone")}</div>
            <h3>Перевод на телефон</h3>
            <p>Отправьте виртуальные NEX на свой вымышленный кошелёк +992.</p>
            <a class="primary-button" href="#transfer" data-view="transfer">Перевести${icon("arrow")}</a>
          </section>
        </div>
        <div class="overview-grid overview-grid--lower">
          <section class="card transactions-card">
            <div class="card-title-row"><h2>Последние операции</h2><a class="text-button" href="#operations" data-view="operations">Все операции${icon("chevron")}</a></div>
            <div class="transaction-list">${transactions.map(transactionMarkup).join("")}</div>
          </section>
          <section class="card security-card">
            <div class="security-card__icon">${icon("warning")}</div>
            <h3>Пароль скомпрометирован</h3>
            <p>Учебный скрипт нашёл пароль <b>admin123</b>. Такой пароль слишком предсказуем.</p>
            <div class="security-card__stat"><span>Время подбора в симуляции</span><strong>4,8 сек</strong></div>
            <button class="secondary-button" type="button" data-action="password-help">Как защитить аккаунт?</button>
          </section>
        </div>
      </div>`;
  }

  function transactionMarkup(transaction) {
    const incoming = transaction.amount > 0;
    const amount = `${incoming ? "+" : "−"}${formatMoney(transaction.amount)} NEX`;
    return `
      <div class="transaction">
        <div class="transaction__icon ${incoming ? "transaction__icon--in" : "transaction__icon--out"}">${icon(transaction.icon || (incoming ? "trending" : "send"))}</div>
        <div class="transaction__info"><strong>${escapeHtml(transaction.title)}</strong><span>${escapeHtml(transaction.subtitle)}</span></div>
        <div class="transaction__amount ${incoming ? "transaction__amount--in" : "transaction__amount--out"}">${amount}</div>
      </div>`;
  }

  function renderTransfer() {
    const suggestedAmount = Math.min(25000, state.victimBalance);
    return `
      <div class="view">
        <div class="page-heading"><div><h1>Перевод на мобильный кошелёк</h1><p>Перенесите демо-средства с админского счёта в свой профиль.</p></div></div>
        <div class="transfer-layout">
          <section class="card transfer-form-card">
            <div class="transfer-form-card__heading"><div class="transaction__icon">${icon("send")}</div><div><h2>Детали перевода</h2><p>Все поля заполнены вымышленными данными</p></div></div>
            <form id="transfer-form">
              <div class="form-grid">
                <div class="field">
                  <label class="field__label" for="phone">Номер получателя</label>
                  <div class="input-wrap">${icon("phone")}<input class="input input--mono" id="phone" name="phone" type="tel" inputmode="tel" maxlength="20" value="${escapeHtml(state.phone)}" required aria-describedby="phone-note" /></div>
                  <p class="form-note" id="phone-note">${icon("info")}Только вымышленный номер +992. Не вводите настоящий.</p>
                </div>
                <div class="field">
                  <label class="field__label" for="amount">Сумма<span class="field__hint">Доступно ${formatMoney(state.victimBalance)} NEX</span></label>
                  <input class="input input--mono" id="amount" name="amount" type="number" min="100" max="${state.victimBalance}" step="100" value="${suggestedAmount}" required />
                  <div class="amount-chips">
                    <button class="amount-chip" type="button" data-action="quick-amount" data-amount="10000">10 000</button>
                    <button class="amount-chip" type="button" data-action="quick-amount" data-amount="25000">25 000</button>
                    <button class="amount-chip" type="button" data-action="quick-amount" data-amount="50000">50 000</button>
                    <button class="amount-chip" type="button" data-action="quick-amount" data-amount="${state.victimBalance}">Всё</button>
                  </div>
                </div>
              </div>
              <div class="transfer-summary">
                <div class="summary-row"><span>Счёт отправителя</span><strong>•••• 4242</strong></div>
                <div class="summary-row"><span>Комиссия</span><strong>0 NEX</strong></div>
                <div class="summary-row summary-row--total"><span>К переводу</span><strong id="transfer-total">${formatMoney(suggestedAmount)} NEX</strong></div>
              </div>
              <button class="primary-button primary-button--wide" type="submit" ${state.victimBalance < 100 ? "disabled" : ""}>${icon("lock")}Перевести демо-средства${icon("arrow")}</button>
            </form>
          </section>
          <aside class="transfer-aside">
            <section class="card recipient-card">
              <div class="recipient-card__avatar">${icon("user")}</div>
              <h3>Мой демо-кошелёк</h3>
              <p id="recipient-preview">${escapeHtml(state.phone)}</p>
              <span class="recipient-card__badge">${icon("check")}Учебный получатель</span>
            </section>
            <section class="card demo-notice">${icon("info")}<div><strong>Это не настоящий платёж</strong><p>Номер и сумма остаются в вашем браузере. Никакие деньги не списываются и никуда не отправляются.</p></div></section>
          </aside>
        </div>
      </div>`;
  }

  function renderOperations() {
    const transactions = [...state.transactions, ...baseTransactions];
    return `
      <div class="view">
        <div class="page-heading"><div><h1>История операций</h1><p>Операции администратора · Все данные вымышлены.</p></div><a class="primary-button" href="#transfer" data-view="transfer">${icon("send")}Новый перевод</a></div>
        <section class="card transactions-card">
          <div class="card-title-row"><h2>Все операции</h2><span class="mini-badge">${transactions.length} записей</span></div>
          <div class="transaction-list">${transactions.map(transactionMarkup).join("")}</div>
        </section>
      </div>`;
  }

  function renderProfile() {
    const hasMoney = state.studentBalance > 0;
    return `
      <div class="view">
        <div class="page-heading"><div><h1>Мой профиль</h1><p>Личный кошелёк юного кибер-исследователя.</p></div><span class="mini-badge">Локальный демо-профиль</span></div>
        <div class="profile-grid">
          <section class="card wallet-card">
            <div class="wallet-card__label">${icon("wallet")}Мой баланс</div>
            <div class="wallet-card__amount">${formatMoney(state.studentBalance)} <small>NEX</small></div>
            <p>${state.phished ? "Баланс после учебной фишинговой атаки" : "Виртуальные средства · не имеют денежной ценности"}</p>
            <div class="wallet-card__bottom"><span>${escapeHtml(state.phone)}</span><span class="wallet-card__status"><span class="status-dot"></span>${state.phished ? "Нужна проверка" : "Активен"}</span></div>
          </section>
          <section class="card identity-card">
            <div class="avatar avatar--student">YOU</div>
            <h2>Юный исследователь</h2>
            <p>${escapeHtml(state.phone)}</p>
            <div class="identity-card__badges"><span class="mini-badge">Уровень: новичок</span><span class="mini-badge">NEXA Pay</span></div>
          </section>
        </div>
        ${state.phished ? renderPhishedBanner() : renderPromo(hasMoney)}
        <section class="card profile-history">
          <div class="card-title-row"><h2>Операции кошелька</h2><span class="mini-badge">Мой профиль</span></div>
          <div class="transaction-list">
            ${state.studentTransactions.length ? state.studentTransactions.map(transactionMarkup).join("") : `<div class="empty-state">Здесь появится ваш первый перевод из демо-банка.</div>`}
          </div>
        </section>
      </div>`;
  }

  function renderPromo(hasMoney) {
    return `
      <section class="card promo-banner">
        <div class="promo-banner__text">
          <p class="promo-banner__eyebrow">${icon("sparkles")}NEXA BONUS · ТОЛЬКО СЕГОДНЯ</p>
          <h2>Секретная акция для своих!</h2>
          <p>Бонус начислится автоматически. Просто перейдите по ссылке.</p>
        </div>
        <div class="promo-banner__action">
          <a class="promo-link" href="#double" data-action="double-balance">${icon("sparkles")}Удвойте свой баланс!${icon("arrow")}</a>
          <div class="promo-timer">${icon("clock")}Предложение исчезнет через <strong id="promo-countdown">09:59</strong></div>
          ${hasMoney ? "" : "<p class=\"form-note\">Сначала переведите демо-средства из админ-панели.</p>"}
        </div>
      </section>`;
  }

  function renderPhishedBanner() {
    return `
      <section class="card phished-banner">
        <div class="phished-banner__icon">${icon("warning")}</div>
        <div><h2>Акция оказалась фишинговой ловушкой</h2><p>Демо-баланс исчез. Разберите три признака, которые должны были вас насторожить.</p></div>
        <a class="secondary-button" href="#lesson" data-view="lesson">Разобрать атаку${icon("arrow")}</a>
      </section>`;
  }

  function renderLesson() {
    return `
      <div class="view">
        <section class="card lesson-hero">
          <p class="eyebrow">${icon("check")}Миссия завершена · Урок пройден</p>
          <h1>Вы поймали фишинг.<br>Теперь вы знаете, как он работает.</h1>
          <p>Мошенники используют любопытство, спешку и обещание лёгкой выгоды. Лучшая защита — остановиться и проверить предложение до перехода по ссылке.</p>
          <div class="lesson-result">
            <div class="lesson-result__item"><span>Баланс до ссылки</span><strong>${formatMoney(state.phishingLoss)} NEX</strong></div>
            <div class="lesson-result__item lesson-result__item--lost"><span>Баланс после</span><strong>0 NEX</strong></div>
          </div>
        </section>
        <div class="clues-grid">
          <section class="card clue-card"><div class="clue-card__number">01</div><h3>Слишком хорошо, чтобы быть правдой</h3><p>Обещание мгновенно удвоить деньги — классический крючок. Бесплатные бонусы должны вызывать вопросы, а не спешку.</p></section>
          <section class="card clue-card"><div class="clue-card__number">02</div><h3>Искусственная срочность</h3><p>Таймер и слова «только сегодня» заставляют действовать быстро. Настоящая проверка безопасности не мешает вам подумать.</p></section>
          <section class="card clue-card"><div class="clue-card__number">03</div><h3>Неожиданная ссылка</h3><p>Не переходите по неожиданным ссылкам. Откройте официальное приложение самостоятельно или спросите взрослого, которому доверяете.</p></section>
        </div>
        <div class="lesson-bottom">
          <section class="card truth-card">
            <div class="truth-card__heading">${icon("info")}<h2>Что произошло на самом деле?</h2></div>
            <p>Здесь клик лишь запускает заранее записанную анимацию. В реальной жизни один клик обычно не опустошает счёт: фишинговый сайт пытается украсть пароль, код подтверждения или активную сессию, либо обманом заставить подтвердить перевод.</p>
            <p>Никогда не вводите настоящие пароли и коды на подозрительных страницах. Если уже ввели — сразу расскажите взрослому и обратитесь в банк по официальному номеру.</p>
          </section>
          <section class="card password-recap">
            <div class="password-recap__heading">${icon("lock")}<h2>Не забудьте про пароль</h2></div>
            <p>Используйте длинную уникальную парольную фразу для каждого аккаунта и включайте двухфакторную аутентификацию.</p>
            <div class="password-example"><code>admin123</code><span>Слабый и предсказуемый</span></div>
            <div class="password-example password-example--strong"><code>Луна!Робот!Сок!42</code><span>Длинная фраза · только пример</span></div>
          </section>
        </div>
        <div class="lesson-actions">
          <button class="secondary-button" type="button" data-action="reset-demo">${icon("refresh")}Пройти миссию заново</button>
          <a class="primary-button" href="#profile" data-view="profile">Вернуться в профиль${icon("arrow")}</a>
        </div>
      </div>`;
  }

  function openModal(content) {
    modalVersion += 1;
    modalRoot.innerHTML = `<div class="modal-backdrop">${content}</div>`;
    document.body.classList.add("modal-open");
    return modalVersion;
  }

  function openOverlay(content) {
    modalVersion += 1;
    modalRoot.innerHTML = content;
    document.body.classList.add("modal-open");
    return modalVersion;
  }

  function closeModal() {
    modalVersion += 1;
    modalRoot.innerHTML = "";
    document.body.classList.remove("modal-open");
  }

  function showInfo() {
    openModal(`
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="info-title">
        <button class="icon-button modal__close" type="button" data-action="close-modal" aria-label="Закрыть">${icon("close")}</button>
        <div class="modal__icon">${icon("shield")}</div>
        <h2 id="info-title">Безопасная учебная симуляция</h2>
        <p>NEXA — вымышленный банк. Подбор пароля выполняется над локальными данными этой страницы, а переводы существуют только в вашем браузере.</p>
        <div class="confirm-receipt">
          <div class="summary-row"><span>Настоящие деньги</span><strong>Нет</strong></div>
          <div class="summary-row"><span>Сбор паролей</span><strong>Нет</strong></div>
          <div class="summary-row"><span>Атаки на сайты</span><strong>Нет</strong></div>
          <div class="summary-row"><span>Интерактивный урок</span><strong>Да</strong></div>
        </div>
        <div class="modal__actions"><button class="primary-button" type="button" data-action="close-modal">Понятно</button></div>
      </section>`);
  }

  function showPasswordHelp() {
    openModal(`
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="password-title">
        <button class="icon-button modal__close" type="button" data-action="close-modal" aria-label="Закрыть">${icon("close")}</button>
        <div class="modal__icon modal__icon--warning">${icon("lock")}</div>
        <h2 id="password-title">Почему admin123 подобрали так быстро?</h2>
        <p>Он короткий, содержит популярное слово и простую последовательность цифр. Автоматические программы пробуют такие комбинации среди первых.</p>
        <div class="password-example"><code>admin123</code><span>Слабый</span></div>
        <div class="password-example password-example--strong"><code>Луна!Робот!Сок!42</code><span>Длинная фраза</span></div>
        <p>Используйте уникальную парольную фразу для каждого сервиса, менеджер паролей и двухфакторную аутентификацию. Ограничение попыток входа тоже помогает защитить аккаунт.</p>
        <div class="modal__actions"><button class="primary-button" type="button" data-action="close-modal">Запомню</button></div>
      </section>`);
  }

  function startBruteForce() {
    const version = openModal(`
      <section class="modal terminal-modal" role="dialog" aria-modal="true" aria-labelledby="terminal-title">
        <header class="terminal-header">
          <div class="terminal-dots"><span></span><span></span><span></span></div>
          <div class="terminal-header__title" id="terminal-title">${icon("terminal")}nexa_password_lab.sh</div>
          <span class="terminal-header__demo">SAFE DEMO</span>
        </header>
        <div class="terminal-body">
          <div class="terminal-command">./nexa_password_lab.sh --local-demo --user admin</div>
          <div class="terminal-system">[SYSTEM] Загружен учебный словарь: <span>9 записей</span><br>[SYSTEM] Режим: <span>локальная симуляция / без сети</span></div>
          <div class="terminal-attempts" id="terminal-attempts"></div>
          <div class="terminal-progress"><span id="terminal-progress"></span></div>
          <div class="terminal-stats"><span id="terminal-counter">Попытка: 0 / 9</span><span>СКОРОСТЬ: ДЕМО</span><span id="terminal-percent">0%</span></div>
        </div>
        <footer class="terminal-footer">
          <div class="terminal-footer__note" id="terminal-note">${icon("shield")}Никаких реальных запросов к банку или другим сайтам</div>
          <div id="terminal-action"><button class="ghost-button" type="button" data-action="close-modal">Остановить</button></div>
        </footer>
      </section>`);
    runBruteForce(version);
  }

  async function runBruteForce(version) {
    const candidates = ["123456", "password", "qwerty", "111111", "123123", "qwerty123", "admin", "letmein", "admin123"];
    const attempts = document.querySelector("#terminal-attempts");
    await wait(reducedMotion ? 100 : 500);

    for (let index = 0; index < candidates.length; index += 1) {
      if (version !== modalVersion) return;
      const success = index === candidates.length - 1;
      const line = document.createElement("div");
      line.className = `terminal-line ${success ? "terminal-line--success" : ""}`;
      line.innerHTML = `
        <span class="terminal-line__number">[${String(index + 1).padStart(2, "0")}]</span>
        <span class="terminal-line__password">test: '${candidates[index]}'</span>
        <span class="terminal-line__status">${success ? "ACCESS GRANTED" : "DENIED"}</span>`;
      attempts.append(line);
      document.querySelector("#terminal-counter").textContent = `Попытка: ${index + 1} / ${candidates.length}`;
      const percent = Math.round(((index + 1) / candidates.length) * 100);
      document.querySelector("#terminal-percent").textContent = `${percent}%`;
      document.querySelector("#terminal-progress").style.width = `${percent}%`;
      tone(success ? 660 : 145, success ? 0.14 : 0.035, success ? "sine" : "square", 0, success ? 0.04 : 0.008);
      if (success) {
        playSuccess();
        document.querySelector("#terminal-note").innerHTML = `${icon("check")}Слабый пароль найден. Доступ к демо-панели открыт.`;
        document.querySelector("#terminal-action").innerHTML = `<button class="primary-button primary-button--lime" type="button" data-action="finish-hack">Открыть панель${icon("arrow")}</button>`;
        return;
      }
      await wait(reducedMotion ? 60 : 430 + index * 18);
    }
  }

  function finishHack() {
    state.hacked = true;
    saveState();
    closeModal();
    navigate("overview");
    showToast("Доступ открыт: пароль admin123 найден в учебном словаре.");
  }

  function handleTransferSubmit(form) {
    const data = new FormData(form);
    const phone = String(data.get("phone") || "").trim();
    const amount = Number(data.get("amount"));
    const digits = phone.replace(/\D/g, "");

    if (!/^992\d{9}$/.test(digits) || !phone.startsWith("+992")) {
      showToast("Введите вымышленный номер в формате +992 и 9 цифр после кода страны.");
      form.querySelector("#phone").focus();
      return;
    }
    if (!Number.isInteger(amount) || amount < 100 || amount > state.victimBalance) {
      showToast(`Введите целую сумму от 100 до ${formatMoney(state.victimBalance)} NEX.`);
      form.querySelector("#amount").focus();
      return;
    }

    pendingTransfer = { phone, amount };
    openModal(`
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <button class="icon-button modal__close" type="button" data-action="close-modal" aria-label="Закрыть">${icon("close")}</button>
        <div class="modal__icon">${icon("send")}</div>
        <h2 id="confirm-title">Подтвердите перевод</h2>
        <p>Проверьте детали учебной операции перед продолжением.</p>
        <div class="confirm-receipt">
          <div class="confirm-receipt__amount">${formatMoney(amount)} <small>NEX</small></div>
          <div class="summary-row"><span>Отправитель</span><strong>Admin · 4242</strong></div>
          <div class="summary-row"><span>Получатель</span><strong>Мой профиль</strong></div>
          <div class="summary-row"><span>Телефон</span><strong>${escapeHtml(phone)}</strong></div>
          <div class="summary-row"><span>Комиссия</span><strong>0 NEX</strong></div>
        </div>
        <p class="modal-note">${icon("shield")}Виртуальная операция · реальные деньги не используются</p>
        <div class="modal__actions"><button class="secondary-button" type="button" data-action="close-modal">Отмена</button><button class="primary-button" type="button" data-action="confirm-transfer">Подтвердить${icon("arrow")}</button></div>
      </section>`);
  }

  async function processTransfer() {
    if (!pendingTransfer) return;
    const transfer = { ...pendingTransfer };
    pendingTransfer = null;
    const processingVersion = openModal(`
      <section class="modal success-modal" role="dialog" aria-modal="true" aria-label="Обработка перевода">
        <div class="processing-spinner"></div><h2>Выполняем демо-перевод</h2><p>Обновляем виртуальные балансы…</p>
      </section>`);
    tone(360, 0.08, "sine", 0, 0.025);
    await wait(reducedMotion ? 150 : 1100);
    if (processingVersion !== modalVersion) return;

    state.victimBalance -= transfer.amount;
    state.studentBalance += transfer.amount;
    state.phone = transfer.phone;
    state.transferComplete = true;
    state.transactions.unshift({
      title: "Перевод на мобильный кошелёк",
      subtitle: `Только что · ${transfer.phone}`,
      amount: -transfer.amount,
      icon: "send",
    });
    state.studentTransactions.unshift({
      title: "Перевод из NEXA Admin",
      subtitle: "Только что · Основной счёт •••• 4242",
      amount: transfer.amount,
      icon: "trending",
    });
    saveState();
    playSuccess();

    const successVersion = openModal(`
      <section class="modal success-modal" role="dialog" aria-modal="true" aria-labelledby="success-title">
        <div class="success-confetti">${confettiPieces()}</div>
        <div class="modal__icon modal__icon--success">${icon("check")}</div>
        <h2 id="success-title">Перевод выполнен!</h2>
        <div class="success-modal__amount">+${formatMoney(transfer.amount)} NEX</div>
        <p>Средства уже в вашем демо-профиле.</p>
        <button class="primary-button primary-button--wide" type="button" data-action="transfer-success-profile">Перейти в мой профиль${icon("arrow")}</button>
        <p class="success-modal__redirect">Автоматический переход через пару секунд…</p>
      </section>`);
    await wait(reducedMotion ? 400 : 2200);
    if (successVersion !== modalVersion) return;
    closeModal();
    navigate("profile");
  }

  function confettiPieces() {
    const colors = ["#6c53f4", "#dfff72", "#ec5272", "#1caa78", "#f2a93b"];
    return Array.from({ length: 12 }, (_, index) => `<span class="confetti-piece" style="--i:${index};--color:${colors[index % colors.length]}"></span>`).join("");
  }

  function startPromoTimer() {
    promoSeconds = 599;
    const update = () => {
      const element = document.querySelector("#promo-countdown");
      if (!element) return;
      const minutes = Math.floor(promoSeconds / 60);
      const seconds = promoSeconds % 60;
      element.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
      promoSeconds = Math.max(0, promoSeconds - 1);
    };
    update();
    promoTimer = setInterval(update, 1000);
  }

  function startPhishing() {
    if (state.phished) {
      navigate("lesson");
      return;
    }
    if (state.studentBalance <= 0) {
      showToast("Сначала вернитесь в админ-панель и переведите демо-средства в свой профиль.");
      return;
    }

    const loss = state.studentBalance;
    state.phished = true;
    state.phishingLoss = loss;
    state.studentBalance = 0;
    state.studentTransactions.unshift({
      title: "«Удвойте свой баланс!»",
      subtitle: "Только что · Фишинговая ссылка",
      amount: -loss,
      icon: "warning",
    });
    saveState();

    const version = openOverlay(`
      <div class="phishing-overlay" id="phishing-overlay">
        <section class="phishing-stage" id="phishing-stage" aria-live="polite">
          <div class="bonus-loader"><div class="bonus-loader__coin">2×</div></div>
          <p class="phishing-stage__eyebrow">NEXA Bonus · Подключение</p>
          <h2>Удваиваем ваш баланс…</h2>
          <p class="phishing-stage__subtitle">Секретный бонус уже почти ваш. Никуда не уходите!</p>
          <div class="bonus-balance"><span id="bonus-balance">${formatMoney(loss)}</span> <small>NEX</small></div>
          <div class="bonus-progress"><span></span></div>
        </section>
        <button class="ghost-button phishing-skip" type="button" data-action="skip-phishing">Пропустить анимацию</button>
      </div>`);
    phishingSession = { version, loss, revealed: false };
    tone(440, 0.12, "sine", 0, 0.035);
    tone(660, 0.12, "sine", 0.15, 0.035);
    runPhishing(version);
  }

  async function runPhishing(version) {
    await wait(reducedMotion ? 250 : 1450);
    if (version !== modalVersion || !phishingSession || phishingSession.revealed) return;
    const balance = document.querySelector("#bonus-balance");
    if (balance) balance.textContent = formatMoney(phishingSession.loss * 2);
    tone(880, 0.18, "sine", 0, 0.04);
    await wait(reducedMotion ? 300 : 1100);
    revealPhishing(version);
  }

  function revealPhishing(version) {
    if (version !== modalVersion || !phishingSession || phishingSession.revealed) return;
    phishingSession.revealed = true;
    const overlay = document.querySelector("#phishing-overlay");
    const stage = document.querySelector("#phishing-stage");
    if (!overlay || !stage) return;
    overlay.classList.add("revealed");
    stage.innerHTML = `
      <div class="hook-scene" aria-hidden="true">
        <svg class="fishing-hook" viewBox="0 0 80 155"><path d="M40 0v105c0 35-40 35-40 0 0-15 10-22 22-20" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>
        ${Array.from({ length: 10 }, (_, index) => `<span class="flying-note" style="--i:${index}">NEX</span>`).join("")}
        <svg class="phish-fish" viewBox="0 0 300 200">
          <defs><linearGradient id="fishBody" x1="0" x2="1"><stop stop-color="#8b65dc"/><stop offset="1" stop-color="#bc568f"/></linearGradient></defs>
          <path d="M68 104 16 59l9 58-12 47 62-25Z" fill="#7650bd"/>
          <ellipse cx="157" cy="108" rx="105" ry="65" fill="url(#fishBody)"/>
          <path d="M137 50q22-38 49 1" fill="#7650bd"/>
          <path d="M119 150q28 39 54 4" fill="#7049b5"/>
          <path d="M119 79q50-23 99 1l-8 37q-45 20-91-1Z" fill="#2a203b"/>
          <circle cx="151" cy="96" r="13" fill="#fff"/><circle cx="196" cy="94" r="13" fill="#fff"/>
          <circle cx="156" cy="98" r="5" fill="#241b35"/><circle cx="201" cy="96" r="5" fill="#241b35"/>
          <path d="M209 135q25 13 42-7" fill="none" stroke="#44284d" stroke-width="5" stroke-linecap="round"/>
          <path d="M235 121h47v33h-47z" fill="#dfff72" stroke="#829c43" stroke-width="3"/><path d="M250 128v19M267 128v19" stroke="#829c43" stroke-width="3"/>
          <text x="45" y="30" fill="#d7cce4" font-family="Manrope, sans-serif" font-size="13" font-weight="700">СПАСИБО ЗА NEX!</text>
        </svg>
      </div>
      <p class="phishing-stage__eyebrow" style="color:#ffafc4">Фишинговая ловушка · Это был розыгрыш</p>
      <h2>Деньги уплыли!</h2>
      <p class="phishing-stage__subtitle">Вы нажали на слишком заманчивое предложение. Хитрая рыбка-фишер забрала все виртуальные NEX.</p>
      <div class="phishing-loss">−${formatMoney(phishingSession.loss)} NEX</div>
      <div class="phishing-balance">Ваш новый баланс: <strong>0 NEX</strong></div>
      <button class="primary-button" type="button" data-action="show-lesson">Разобраться, что произошло${icon("arrow")}</button>
      <div class="phishing-disclaimer">Все средства виртуальные. Настоящие деньги не пострадали.</div>`;
    const skip = document.querySelector(".phishing-skip");
    if (skip) skip.remove();
    playPhishSound();
  }

  function showLesson() {
    state.lessonComplete = true;
    saveState();
    closeModal();
    navigate("lesson");
  }

  function showResetConfirmation() {
    openModal(`
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="reset-title">
        <button class="icon-button modal__close" type="button" data-action="close-modal" aria-label="Закрыть">${icon("close")}</button>
        <div class="modal__icon modal__icon--warning">${icon("refresh")}</div>
        <h2 id="reset-title">Начать миссию заново?</h2>
        <p>Демо-балансы, переводы и результат фишинга будут сброшены на этом устройстве.</p>
        <div class="modal__actions"><button class="secondary-button" type="button" data-action="close-modal">Отмена</button><button class="danger-button" type="button" data-action="confirm-reset">Да, начать заново</button></div>
      </section>`);
  }

  function resetDemo() {
    localStorage.removeItem(STORAGE_KEY);
    state = { ...initialState, transactions: [], studentTransactions: [] };
    pendingTransfer = null;
    phishingSession = null;
    currentView = "overview";
    closeModal();
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    render();
    showToast("Миссия сброшена. Можно начинать заново!");
  }

  function navigate(view) {
    if (!VALID_VIEWS.includes(view)) view = "overview";
    currentView = view;
    if (window.location.hash !== `#${view}`) {
      window.location.hash = view;
    } else {
      render();
    }
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
  }

  function updateTransferSummary() {
    const amountInput = document.querySelector("#amount");
    const total = document.querySelector("#transfer-total");
    if (!amountInput || !total) return;
    const amount = Number(amountInput.value);
    total.textContent = `${formatMoney(Number.isFinite(amount) ? amount : 0)} NEX`;
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("visible");
    toastTimer = setTimeout(() => toast.classList.remove("visible"), 3600);
  }

  function wait(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }

  function tone(frequency, duration = 0.08, type = "sine", delay = 0, volume = 0.025) {
    if (!state.sound) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      audioContext ||= new AudioContextClass();
      if (audioContext.state === "suspended") audioContext.resume();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const start = audioContext.currentTime + delay;
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.02);
    } catch {
      return;
    }
  }

  function playSuccess() {
    tone(523, 0.18, "sine", 0, 0.035);
    tone(659, 0.18, "sine", 0.12, 0.035);
    tone(784, 0.26, "sine", 0.24, 0.04);
  }

  function playPhishSound() {
    tone(392, 0.18, "triangle", 0, 0.04);
    tone(330, 0.18, "triangle", 0.18, 0.04);
    tone(262, 0.22, "triangle", 0.36, 0.04);
    tone(196, 0.4, "triangle", 0.56, 0.045);
  }

  document.addEventListener("submit", (event) => {
    if (event.target.id === "login-form") {
      event.preventDefault();
      startBruteForce();
    }
    if (event.target.id === "transfer-form") {
      event.preventDefault();
      handleTransferSubmit(event.target);
    }
  });

  document.addEventListener("input", (event) => {
    if (event.target.id === "amount") updateTransferSummary();
    if (event.target.id === "phone") {
      const preview = document.querySelector("#recipient-preview");
      if (preview) preview.textContent = event.target.value || "+992 …";
    }
  });

  document.addEventListener("click", (event) => {
    const viewLink = event.target.closest("[data-view]");
    if (viewLink) {
      event.preventDefault();
      navigate(viewLink.dataset.view);
      return;
    }

    const button = event.target.closest("[data-action]");
    if (!button) return;
    const action = button.dataset.action;

    if (action === "double-balance") event.preventDefault();
    switch (action) {
      case "toggle-sound":
        state.sound = !state.sound;
        saveState();
        render();
        if (state.sound) tone(660, 0.1);
        break;
      case "show-info": showInfo(); break;
      case "password-help": showPasswordHelp(); break;
      case "close-modal": closeModal(); break;
      case "finish-hack": finishHack(); break;
      case "confirm-transfer": processTransfer(); break;
      case "transfer-success-profile":
        closeModal();
        navigate("profile");
        break;
      case "quick-amount": {
        const input = document.querySelector("#amount");
        if (input) {
          input.value = Math.min(Number(button.dataset.amount), state.victimBalance);
          updateTransferSummary();
        }
        break;
      }
      case "double-balance": startPhishing(); break;
      case "skip-phishing": revealPhishing(modalVersion); break;
      case "show-lesson": showLesson(); break;
      case "reset-demo": showResetConfirmation(); break;
      case "confirm-reset": resetDemo(); break;
      case "notification": showToast("Учебное уведомление: проверьте уровень защиты аккаунта."); break;
      default: break;
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modalRoot.innerHTML && !document.querySelector(".phishing-overlay")) closeModal();
  });

  window.addEventListener("hashchange", () => {
    if (!state.hacked) return;
    const hashView = window.location.hash.slice(1);
    currentView = VALID_VIEWS.includes(hashView) ? hashView : "overview";
    if (currentView === "lesson" && !state.phished) currentView = "overview";
    render();
  });

  if (state.hacked) {
    const hashView = window.location.hash.slice(1);
    currentView = VALID_VIEWS.includes(hashView) ? hashView : "overview";
    if (!window.location.hash) window.history.replaceState(null, "", "#overview");
  }

  render();
})();
