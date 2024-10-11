type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
type InputTag = "input" | "textarea" | "json";
type Field = InputTag | { [key: string]: Field };
type Fields = Record<string, Field>;

type Operation = {
  name: string;
  endpoint: string;
  method: HttpMethod;
  fields: Fields;
  useFetch?: boolean; // don't use fetch for Spotify Authentication
};

/**
 * This list of operations is used to generate the manual testing UI.
 */
const operations: Operation[] = [
  {
    name: "Get Session User (logged in user)",
    endpoint: "/api/session",
    method: "GET",
    fields: {},
  },
  {
    name: "Login with [Spotify]",
    endpoint: "/api/spotify",
    method: "GET",
    fields: {},
    useFetch: false,
  },
  {
    name: "Logout",
    endpoint: "/api/logout",
    method: "POST",
    fields: {},
  },
  {
    name: "Delete User",
    endpoint: "/api/users",
    method: "DELETE",
    fields: {},
  },
  {
    name: "Get Users (empty for all)",
    endpoint: "/api/users/:username",
    method: "GET",
    fields: { username: "input" },
  },
  {
    name: "Get All Songs User Posted (empty for all)",
    endpoint: "/api/songs/:username",
    method: "GET",
    fields: { username: "input" },
  },
  {
    name: "Save Song Info (i.e. create post)",
    endpoint: "/api/songs",
    method: "POST",
    fields: {},
  },
  {
    name: "Delete Song (i.e. delete post)",
    endpoint: "/api/songs/:id",
    method: "DELETE",
    fields: { _id: "input" },
  },
  {
    name: "Get Covers by Username, Song (empty for all)",
    endpoint: "/api/covers",
    method: "GET",
    fields: { userId: "input", songId: "input" },
  },
  {
    name: "Get Not Locked Covers by Username (empty for all)",
    endpoint: "/api/covers/notLocked/:username",
    method: "GET",
    fields: { username: "input" },
  },
  {
    name: "Create Covers",
    endpoint: "/api/covers",
    method: "POST",
    fields: { songId: "input", text: "input", lyrics: "input", image: "input" },
  },
  {
    name: "Update Covers",
    endpoint: "/api/cover/:coverId",
    method: "PATCH",
    fields: { coverId: "input", text: "input", lyrics: "input", image: "input" },
  },
  {
    name: "Delete Covers",
    endpoint: "/api/covers/:coverId",
    method: "DELETE",
    fields: { coverId: "input" },
  },
  {
    name: "Get All Snapshots by Username (empty for all)",
    endpoint: "/api/snapshots/all/:username",
    method: "GET",
    fields: { username: "input" },
  },
  {
    name: "Get Unexpired Snapshots by Username (empty for all)",
    endpoint: "/api/snapshots/notExpired/:username",
    method: "GET",
    fields: { username: "input" },
  },
  {
    name: "Create Snapshots",
    endpoint: "/api/snapshots",
    method: "POST",
    fields: { post: "input", text: "input", lyrics: "input", image: "input" },
  },
  {
    name: "Delete Snapshots",
    endpoint: "/api/snapshots/:snapshotId",
    method: "DELETE",
    fields: { snapshotId: "input" },
  },
  {
    name: "Get Locks (empty for all)",
    endpoint: "/api/locks/:locker",
    method: "GET",
    fields: { locker: "input" },
  },
  {
    name: "Create Locks",
    endpoint: "/api/locks",
    method: "POST",
    fields: { cover: "input", from: "input", to: "input" },
  },
  {
    name: "Get Friends",
    endpoint: "/api/friends",
    method: "GET",
    fields: {},
  },
  {
    name: "Delete Friend",
    endpoint: "/api/friends/:friend",
    method: "DELETE",
    fields: { friend_username: "input" },
  },
  {
    name: "Get Friend Request",
    endpoint: "/api/friend/requests",
    method: "GET",
    fields: {},
  },
  {
    name: "Send Friend Request",
    endpoint: "/api/friend/requests/:to_username",
    method: "POST",
    fields: { to_username: "input" },
  },
  {
    name: "[NOT USED] Update Locks",
    endpoint: "/api/locks/:id",
    method: "PATCH",
    fields: { id: "input" },
  },
  {
    name: "[NOT USED] Create User",
    endpoint: "/api/users",
    method: "POST",
    fields: { username: "input", password: "input" },
  },
  {
    name: "[NOT USED] Login",
    endpoint: "/api/login",
    method: "POST",
    fields: { username: "input", password: "input" },
  },
  {
    name: "[NOT USED] Update Post",
    endpoint: "/api/songs/:id",
    method: "PATCH",
    fields: { id: "input", content: "input", options: { backgroundColor: "input" } },
  },
  {
    name: "[NOT USED] Update Password",
    endpoint: "/api/users/password",
    method: "PATCH",
    fields: { currentPassword: "input", newPassword: "input" },
  },
];

/*
 * You should not need to edit below.
 * Please ask if you have questions about what this test code is doing!
 */

function updateResponse(code: string, response: string) {
  document.querySelector("#status-code")!.innerHTML = code;
  document.querySelector("#response-text")!.innerHTML = response;
}

async function request(method: HttpMethod, endpoint: string, params?: unknown) {
  try {
    if (method === "GET" && params) {
      endpoint += "?" + new URLSearchParams(params as Record<string, string>).toString();
      params = undefined;
    }

    const res = fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // "same-origin"
      body: params ? JSON.stringify(params) : undefined,
    });

    return {
      $statusCode: (await res).status,
      $response: await (await res).json(),
    };
  } catch (e) {
    console.log(e);
    return {
      $statusCode: "???",
      $response: { error: "Something went wrong, check your console log.", details: e },
    };
  }
}

function fieldsToHtml(fields: Record<string, Field>, indent = 0, prefix = ""): string {
  return Object.entries(fields)
    .map(([name, tag]) => {
      const htmlTag = tag === "json" ? "textarea" : tag;
      return `
        <div class="field" style="margin-left: ${indent}px">
          <label>${name}:
          ${typeof tag === "string" ? `<${htmlTag} name="${prefix}${name}"></${htmlTag}>` : fieldsToHtml(tag, indent + 10, prefix + name + ".")}
          </label>
        </div>`;
    })
    .join("");
}

function getHtmlOperations() {
  return operations.map((operation) => {
    return `<li class="operation">
      <h3>${operation.name}</h3>
      <form class="operation-form">
        <input type="hidden" name="$endpoint" value="${operation.endpoint}" />
        <input type="hidden" name="$method" value="${operation.method}" />
        ${fieldsToHtml(operation.fields)}
        <button type="submit">Submit</button>
      </form>
    </li>`;
  });
}

function prefixedRecordIntoObject(record: Record<string, string>) {
  const obj: any = {}; // eslint-disable-line
  for (const [key, value] of Object.entries(record)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    const keys = key.split(".");
    const lastKey = keys.pop()!;
    let currentObj = obj;
    for (const key of keys) {
      if (!currentObj[key]) {
        currentObj[key] = {};
      }
      currentObj = currentObj[key];
    }
    currentObj[lastKey] = value;
  }
  return obj;
}

async function submitEventHandler(e: Event) {
  e.preventDefault();
  const form = e.target as HTMLFormElement;
  const { $method, $endpoint, ...reqData } = Object.fromEntries(new FormData(form));

  // Replace :param with the actual value.
  const endpoint = ($endpoint as string).replace(/:(\w+)/g, (_, key) => {
    const param = reqData[key] as string;
    delete reqData[key];
    return param;
  });

  const op = operations.find((op) => op.endpoint === $endpoint && op.method === $method);

  // for Spotify authentication
  if (op && op.useFetch === false) {
    window.location.href = endpoint;
    return;
  }

  const pairs = Object.entries(reqData);
  for (const [key, val] of pairs) {
    if (val === "") {
      delete reqData[key];
      continue;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const type = key.split(".").reduce((obj, key) => obj[key], op?.fields as any);

    if (key === "from" || key === "to") {
      reqData[key] = new Date(val as string).toISOString(); // Converts string to Date object
      if (isNaN(Date.parse(val as string))) {
        updateResponse("400", `Invalid date format for '${key}'`);
        return;
      }
    }

    if (type === "json") {
      reqData[key] = JSON.parse(val as string);
    }
  }

  const data = prefixedRecordIntoObject(reqData as Record<string, string>);

  updateResponse("", "Loading...");
  const response = await request($method as HttpMethod, endpoint as string, Object.keys(data).length > 0 ? data : undefined);
  updateResponse(response.$statusCode.toString(), JSON.stringify(response.$response, null, 2));
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelector("#operations-list")!.innerHTML = getHtmlOperations().join("");
  document.querySelectorAll(".operation-form").forEach((form) => form.addEventListener("submit", submitEventHandler));

  const urlParams = new URLSearchParams(window.location.search);
  const error = urlParams.get("error");
  const success = urlParams.get("success");

  if (error) {
    updateResponse("Error", decodeURIComponent(error));
    window.history.replaceState({}, document.title, window.location.pathname);
  } else if (success) {
    updateResponse("Success", decodeURIComponent(success));
    window.history.replaceState({}, document.title, window.location.pathname);
  }
});
