<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { tr } from "$/utils/i18n";
  import { iconCodepoints, type MaterialIcon } from "$/styles/mdi_icons";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import { appConfig, userIcons } from "$/stores";
  import { FileUtils } from "$/utils/file_utils";
  import { Toasts } from "$/utils/toasts";
  import { fetchMdiSvg, normalizeMdiName, searchMdiIcons, type MdiSearchResult } from "$/utils/mdi";

  interface Props {
    onSubmit: (i: MaterialIcon) => void;
    onSubmitSvg: (i: string) => void;
  }

  let { onSubmit, onSubmitSvg }: Props = $props();

  let iconNames = $state<MaterialIcon[]>([]);
  let search = $state<string>("");
  let deleteMode = $state<boolean>(false);
  let mdiQuery = $state<string>("");
  let mdiResults = $state<MdiSearchResult[]>([]);
  let mdiLoading = $state<boolean>(false);
  let mdiSearchTimer: ReturnType<typeof setTimeout> | undefined;
  let dropdown: HTMLDivElement;

  const onShow = () => {
    if (iconNames.length === 0) {
      iconNames = Object.keys(iconCodepoints) as MaterialIcon[];
    }
  };

  const addOwn = async () => {
    try {
      let counter = 0;
      const xmls = await FileUtils.pickAndReadTextFile("svg", true);
      const iconsToAdd = xmls.map((xml) => ({
        name: `i_${FileUtils.timestampFloat()}_${counter++}`,
        data: xml,
      }));

      userIcons.update((prev) => [...prev, ...iconsToAdd]);
    } catch (e) {
      Toasts.error(e);
    }
  };

  const svgClicked = (name: string, data: string) => {
    if (deleteMode) {
      userIcons.update((prev) => prev.filter((e) => e.name !== name));
      return;
    }

    onSubmitSvg(data);
  };

  const iconClicked = (i: MaterialIcon) => {
    if (deleteMode) {
      return;
    }

    onSubmit(i);
  };

  const importMdi = async (name: string) => {
    try {
      mdiLoading = true;
      const icon = await fetchMdiSvg(name);
      userIcons.update((prev) => {
        const withoutPrevious = prev.filter((item) => item.name !== icon.name);
        return [...withoutPrevious, { name: icon.name, data: icon.svg }];
      });
      onSubmitSvg(icon.svg);
    } catch (e) {
      Toasts.error(e);
    } finally {
      mdiLoading = false;
    }
  };

  const runMdiSearch = async () => {
    const exactName = normalizeMdiName(mdiQuery);
    try {
      mdiLoading = true;
      mdiResults = await searchMdiIcons(mdiQuery);
      if (exactName && !mdiResults.some((item) => item.id === exactName)) {
        mdiResults = [{ name: exactName.slice(4), id: exactName, svgUrl: `https://api.iconify.design/mdi/${exactName.slice(4)}.svg` }, ...mdiResults];
      }
    } catch (e) {
      mdiResults = [];
      Toasts.error(e);
    } finally {
      mdiLoading = false;
    }
  };

  const mdiQueryChanged = () => {
    if (mdiSearchTimer) clearTimeout(mdiSearchTimer);
    if (mdiQuery.trim().length < 2) {
      mdiResults = [];
      return;
    }
    mdiSearchTimer = setTimeout(runMdiSearch, 300);
  };

  onMount(() => {
    dropdown?.addEventListener("show.bs.dropdown", onShow);
  });

  onDestroy(() => {
    dropdown?.removeEventListener("show.bs.dropdown", onShow);
    if (mdiSearchTimer) clearTimeout(mdiSearchTimer);
  });
</script>

<div class="dropdown" bind:this={dropdown}>
  <button class="btn btn-sm btn-secondary" data-bs-toggle="dropdown" data-bs-auto-close="outside">
    <MdIcon icon="emoji_emotions" />
    <MdIcon icon="add" />
  </button>

  <div class="dropdown-menu">
    <h6 class="dropdown-header">{$tr("editor.iconpicker.title")}</h6>
    <div class="p-3">
      <input
        disabled={$appConfig.iconListMode === "user"}
        type="text"
        class="form-control mb-1"
        placeholder={$tr("editor.iconpicker.search")}
        bind:value={search} />

      <div class="mdi-import border rounded p-2 mb-2">
        <label class="form-label small mb-1" for="mdi-search">{$tr("editor.iconpicker.mdi.search")}</label>
        <div class="input-group input-group-sm mb-2">
          <span class="input-group-text">mdi:</span>
          <input
            id="mdi-search"
            type="search"
            class="form-control"
            placeholder="fire-extinguisher"
            bind:value={mdiQuery}
            oninput={mdiQueryChanged}
            onkeydown={(e) => e.key === "Enter" && importMdi(mdiQuery)} />
          <button class="btn btn-outline-secondary" disabled={mdiLoading || !normalizeMdiName(mdiQuery)} onclick={() => importMdi(mdiQuery)}>
            <MdIcon icon="download" />
          </button>
        </div>
        {#if mdiLoading}
          <div class="small text-secondary">{$tr("editor.iconpicker.mdi.loading")}</div>
        {:else if mdiResults.length > 0}
          <div class="mdi-results">
            {#each mdiResults as icon (icon.id)}
              <button class="btn btn-light me-1 mb-1" title={icon.id} onclick={() => importMdi(icon.id)}>
                <img src={icon.svgUrl} alt={icon.id} loading="lazy" />
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <div class="input-group input-group-sm mb-1">
        <span class="input-group-text">{$tr("editor.iconpicker.show")}</span>
        <select class="form-select form-select-sm" bind:value={$appConfig.iconListMode}>
          <option value="both">{$tr("editor.iconpicker.show.both")}</option>
          <option value="user">{$tr("editor.iconpicker.show.user")}</option>
          <option value="pack">{$tr("editor.iconpicker.show.pack")}</option>
        </select>
      </div>

      <div class="icons mb-1">
        {#if $appConfig.iconListMode === "both" || $appConfig.iconListMode === "user"}
          {#each $userIcons as { name, data } (name)}
            <button
              class="btn {deleteMode ? 'btn-danger' : 'btn-light'} me-1 mb-1 user-icon"
              onclick={() => svgClicked(name, data)}>
              <img src="data:image/svg+xml;base64,{FileUtils.base64str(data)}" alt="user-svg" />
            </button>
          {/each}
        {/if}

        {#if $appConfig.iconListMode === "both" || $appConfig.iconListMode === "pack"}
          {#each iconNames as name (name)}
            {#if !search || name.includes(search.toLowerCase())}
              <button class="btn me-1" title={name} onclick={() => iconClicked(name)}>
                <MdIcon icon={name} />
              </button>
            {/if}
          {/each}
        {/if}
      </div>

      <div class="input-group input-group-sm mb-1">
        <button class="btn btn-outline-secondary" onclick={addOwn}>
          <MdIcon icon="add" />

          {$tr("editor.iconpicker.add")}
        </button>
        <button
          class="btn {deleteMode ? 'btn-danger' : 'btn-outline-secondary'}"
          onclick={() => (deleteMode = !deleteMode)}>
          <MdIcon icon="delete" />
          {$tr("editor.iconpicker.delete_mode")}
        </button>
      </div>

      <a
        href="https://fonts.google.com/icons?icon.set=Material+Icons&icon.style=Filled"
        target="_blank"
        class="text-secondary">
        {$tr("editor.iconpicker.mdi_link_title")}
      </a>
    </div>
  </div>
</div>

<style>
  .dropdown-menu {
    width: 100vw;
    max-width: 450px;
  }
  .icons {
    max-height: 400px;
    overflow-y: scroll;
  }
  .user-icon img {
    width: 24px;
  }
  .mdi-results {
    max-height: 160px;
    overflow-y: auto;
  }
  .mdi-results img {
    width: 24px;
    height: 24px;
  }
</style>
