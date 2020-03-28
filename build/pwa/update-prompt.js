export function addUpdateModal() {
  let promptModal = document.createElement("div");
  promptModal.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    z-index: 999999999;
    transform: translateX(-50%);
    background: white;
    padding: 1.5em 2em;
    font-size: 0.8em;
    filter: drop-shadow(2px 4px 6px rgba(0,0,0,0.2));
    border-radius: 3px;
    display: flex;
    flex-wrap: wrap;
  `;
  promptModal.innerHTML = `
    <p
      style="
        flex-basis: 100%;
        margin: 0;
        margin-bottom: 10px;
      "
    >
      There’s been an update.
      <br>Please refresh for best results.
    </p>

    <button
      class="reload-page"
      type="button"
      style="
        width: 100%;
        font-size: 1.5em;
        border-radius: 3px;
        flex-basis: 0;
        flex-grow: 1;
      "
    >
      Refresh
    </button>

    <button
      class="do-nothing"
      type="button"
      style="
        width: 100%;
        font-size: 1.5em;
        border-radius: 3px;
        margin-left: 0.5em;
        flex-basis: 0;
        flex-grow: 1;
      "
    >
      Maybe later.
    </button>
  `;

  let killPrompt = () => { document.body.removeChild(promptModal); };
  promptModal.querySelector(".do-nothing").addEventListener("click", killPrompt);
  promptModal.querySelector(".reload-page")
    .addEventListener("click", () => {
      location.reload();
    });

  document.body.appendChild(promptModal);
}
