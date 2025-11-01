# MemeBoard Server - Documentation

# Index

- [MemeBoard Server - Documentation](#memeboard-server---documentation)
  - [General Notes](#general-notes)
  - [Environment Vars](#environment-vars)
    - [General](#general)
    - [Server Origins](#server-origins)
    - [CORS Configuration](#cors-configuration)
    - [Dev Mode Default User](#dev-mode-default-user)
    - [Firebase](#firebase)
    - [Firebase Emulators](#firebase-emulators)
    - [Redis](#redis)
  - [Model Docs](#model-docs)
    - [MemeImageModel](#memeimagemodel)
    - [SavedMemeModel](#savedmememodel)
  - [API Docs](#api-docs)
    - Logs
      - [POST `/api/v1/logs`](#post-apiv1logs)
    - MemeImages
      - [POST `/api/v1/meme-images`](#post-apiv1meme-images)
      - [GET `/api/v1/meme-images`](#get-apiv1meme-imageschunkint1tagsstringinvalidatecacheboolfalse)
      - [PATCH `/api/v1/meme-images/{id}`](#patch-apiv1meme-imagesid)
      - [GET `/api/v1/meme-images/{id}`](#get-apiv1meme-imagesid)
      - [PATCH `/api/v1/meme-images/{id}/image`](#patch-apiv1meme-imagesidimage)
      - [GET `/api/v1/meme-images/{imageHash}/image`](#get-apiv1meme-imagesimageHashimage)
    - CreatedMemes
      - [POST `/api/v1/created-memes`](#post-apiv1created-memes)
      - [GET `/api/v1/created-memes`](#get-apiv1created-memeschunkint1)
  - [Rate Limits](#rate-limits-per-min)

## General Notes

- _Error Handling_: All error responses have an HTTP status code and a JSON body `{ message: string }`, which should be displayed directly to the user.
- _Pagination_: Endpoints supporting query-based listing (e.g., `readListOnQuery`) expect query parameters like `perPageLimit`, `currentPage`, `sortOn`, and `sortOrder`.
- _Image Retrieval_: `readImage` endpoints return a single image via HTTP as `image/*`.

---

## Environment Vars

### General

- **`ENVIRONMENT_TYPE`**
  - Environment the app is running in (e.g., `dev`, `devnoemu`).
  - _Default value:_ `dev`

### Server Origins

- **`API_SERVER_ORIGIN`**

  - The base URL of the backend API server.
  - _Format:_ `http(s)://ipaddr:port`

- **`WEB_SERVER_ORIGIN`**
  - The base URL of the frontend web server.
  - _Format:_ `http(s)://ipaddr:port`

### CORS Configuration

- **`ALLOWED_ORIGINS`**

  - List of explicitly allowed origins for CORS requests.
  - _Default value:_ `[]`

- **`ALLOW_ANY_ORIGIN`**
  - If set to `true`, allows requests from any origin (overrides `ALLOWED_ORIGINS`).
  - _Default value:_ `false`

- **`ALLOW_MISSING_ORIGIN`**
  - If set to `true`, allows requests without an `Origin` header (overrides `ALLOW_ANY_ORIGIN`).
  - _Default value:_ `true`

### Dev Mode Default User

- **`ALLOW_DEVMODE_DEFAULT_USER`**

  - Enables login with a built-in default user for development.
  - When `true`, allows authentication without Firebase using default credentials.
  - Automatically disabled in non-development environments.
  - _Default value:_ `false`

- **`DEVMODE_DEFAULT_USER_ID`**

  - The user ID to assign when using the default user.
  - Only effective if `ALLOW_DEVMODE_DEFAULT_USER` is `true` and the app is running in a development environment.
  - _Default value:_ `DevmodeDefaultUser`

### Firebase

- **`FIREBASE_PROJECT_ID`**

  - Firebase project identifier.
  - _Default value:_ `projectid`

- **`FIREBASE_SERVICE_ACCOUNT_KEY`**

  - Service account key for Firebase admin SDK (JSON string).
  - _Default value:_ _(empty string — expected to be set)_

- **`CUSTOM_FIRESTORE_INDEX_ADMIN_SERVICE_ACCOUNT_KEY`**

  - Optional service account key for Firestore index management.
  - _Default value:_ _(empty string — expected to be set)_

- **`FIREBASE_DATABASE_URL`**

  - Firebase Realtime Database URL.
  - _Default value:_ `https://projectid-default-rtdb.asia-southeast1.firebasedatabase.app`

- **`FIREBASE_STORAGE_BUCKET`**
  - Firebase storage bucket for file uploads.
  - _Default value:_ `projectid.firebasestorage.app`

### Firebase Emulators

- **`FIREBASE_EMULATOR_DATABASE_URL`**

  - Local emulator endpoint for Firebase Realtime Database.
  - _Default value:_ `http://localhost:9002/?ns=projectid`

- **`FIREBASE_EMULATOR_STORAGE_BUCKET`**

  - Local emulator bucket name for Firebase Storage.
  - _Default value:_ `projectid.firebasestorage.app`

- **`FIREBASE_STORAGE_EMULATOR_HOST`**

  - Host and port for Firebase Storage emulator.
  - Don't set this in production environment, else server won't connect to Firebase.
  - _Default value:_ `localhost:9003`

- **`FIRESTORE_EMULATOR_HOST`**
  - Host and port for Firebase Firestore emulator.
  - Don't set this in production environment, else server won't connect to Firebase.
  - _Default value:_ `localhost:9004`

### Redis

- **`REDIS_URL`**
  - Connection URL for Redis (maybe used for caching).
  - _Format:_ `redis://user:password@host:port`
  - _Example Value:_ `redis://default:passwd@redis-xxx.com:xxxxx`

---

## Model Docs

### MemeImageModel

```ts
{
  // internal trackers
  id: string,
  uploaderId: string,

  // public params (set by uploader)
  name: string,            // name given by uploader
  tags: string[],          // tags set by uploader
  imageUrl: string,        // link to public bucket URL

  // private params (edited by uploader)
  isUnavailable: boolean,

  // public params (auto-computed)
  totalViews: int,
  uniqueViews: int,
  totalClicks: int,
  uniqueClicks: int,
  // decayed popularity over time
  rankingScore: int,
}
```

### SavedMemeModel

```ts
{
  id: string,          // id of this meme
  creatorId: string,   // who created the meme
  memeImageId: string, // ref to meme image
  content: [           // an array of all text on the image
    {
      text: string,    // text content within meme
      rgba: string,    // color of each text letter
      x: double,       // x offset of text content (+x from top-left of image)
      y: double,       // y offset of text content (+y from top-left of image)
    },
    ...
  ]
}
```

#### Notes:

- Each text letter is given a border color. For simplicity, the border is the inverse of the text color.
- Out-of-bounds `x` and `y` values will shift the text out of the meme image.

---

## API Docs

#### Notes:

- URL params: `/api/v1/meme-images?chunk=[int:1]` means chunk should `int` and default `1` if not passed.
- URL params: if default not given, query param is required and will cause `400` if absent.
- Chunking system will produce no less than 20 items per chunk.
- Postman [test link](https://avirukbasak-team.postman.co/workspace/API-Testbed~da150b8d-0fe6-4487-b4a8-420c156e003f/collection/19078959-67755831-a3bd-451f-bcfc-620b318961da?action=share&creator=19078959)

---

### POST `/api/v1/logs`

#### Request:

```
{ type: "info" | "error" | "warn", message: string }
```

#### Response (`200`):

```
{ message: `Log type ${type} added on ${timestamp}` }
```

#### Error codes (w/ sample messages):

- 400 `{ message: "Bad request" }`
- 405 `{ message: "Method not allowed" }`
- 429 `{ message: "Too many requests. Try again after some time" }`
- 500 `{ message: "Internal server error" }`

---

### POST `/api/v1/meme-images`

#### Request (example):

Anything within `<>` in the following request is variable.

```tsx
POST /api/v1/meme-images HTTP/<version>
Host: <server-host>
Content-Type: multipart/form-data; boundary=<boundary-name>
Content-Length: <calculated-on-send>

--<boundary-name>
Content-Disposition: form-data; name="metadata"
Content-Type: application/json

{
  "name": "<meme-name>",
  "tags": ["<tag0>", "<tag1>", "<tag2>", "<tag3>", ...]
}
--<boundary-name>
Content-Disposition: form-data; name="image"; filename="<file-name-on-system>"
Content-Type: <image-file-type>

<binary-jpeg-data>
--<boundary-name>--
```

#### Notes:

- Part `name` should be either `metadata` or `image`.
- No restriction on `filename`.
- Only 1 metadata and 1 image part (file) is accepted else response is `400`.
- Image uploaded can be of any format but is converted always to JPEG for compression and consistency.

#### Response (`201`):

```ts
{ message: "Posted meme image", id: string }
```

#### Response (`202`):

Uploading same meme image (SHA256 check after JPEG conversion) will return existing image ID.

```ts
{ message: "Already exists", id: string }
```

#### Error codes (w/ sample messages):

- 400 `{ message: "Bad request" }`
- 401 `{ message: "Not logged in" }`
- 405 `{ message: "Method not allowed" }`
- 429 `{ message: "Too many requests. Try again after some time" }`
- 500 `{ message: "Internal server error" }`

---

### GET `/api/v1/meme-images?chunk=[int:1]&tags=[string:""]&invalidateCache=[bool:false]`

#### Query Params

- `chunk` - Used for pagination / response chunking.
- `tags` - Comma seperated tags for searching.
- `invalidateCache` - Make new DB call & search instead of returning from cache.

#### Response (`200`):

```ts
{
  totalChunks: int,
  currentChunk: int,
  totalItems: int,
  items: [
    {
      id: string,
      name: string,
      tags: string[],
      imageUrl: string,
      createdOn: string,
      lastModifiedOn: string,
      // only shown to uploader
      uploaderId: string,
      totalViews: int,
      uniqueViews: int,
      totalClicks: int,
      uniqueClicks: int,
      rankingScore: int,
      isUnavailable: boolean,
    }
  ]
}
```

#### Notes:

- Chunks act like pages but are not called pages coz they're supposed to be pulled automatically by frontend.
- Frontend should pass chunk number when requesting non-first page.
- `response.items` is returned sorted by non-increasing `item.rankingScore`, which is based on a decayed `item.uniqueClicks`.
- `item.tags` is to be used locally to run search. This enables search without network and latencies.
- `item.name` is also to be used for local searching.
- Adding a search query `q=` runs filtering on `item.name` and `item.tags` in the backend.

#### Error codes (w/ sample messages):

- 400 `{ message: "Bad request" }`
- 405 `{ message: "Method not allowed" }`
- 429 `{ message: "Too many requests. Try again after some time" }`
- 500 `{ message: "Internal server error" }`

---

### PATCH `/api/v1/meme-images/{id}`

#### Request:

```ts
{ isUnavailable?: boolean }
```

#### Response (`200`):

```ts
{ message: "Updated meme availability", memeImageId: string }
```

#### Error codes (w/ sample messages):

- 400 `{ message: "Bad request" }`
- 401 `{ message: "Not logged in" }`
- 404 `{ message: "Not found" }`
- 405 `{ message: "Method not allowed" }`
- 429 `{ message: "Too many requests. Try again after some time" }`
- 500 `{ message: "Internal server error" }`

---

### GET `/api/v1/meme-images/{id}`

#### Response (`200`):

```ts
{
  id: string,
  name: string,
  tags: string[],
  imageUrl: string,
  createdOn: string,
  lastModifiedOn: string,
  // only shown to uploader
  uploaderId: string,
  totalViews: int,
  uniqueViews: int,
  totalClicks: int,
  uniqueClicks: int,
  rankingScore: int,
  isUnavailable: boolean,
}
```

#### Error codes (w/ sample messages):

- 400 `{ message: "Bad request" }`
- 401 `{ message: "Invalid auth credentials" }`
- 404 `{ message: "Meme image not found" }`
- 405 `{ message: "Method not allowed" }`
- 429 `{ message: "Too many requests. Try again after some time" }`
- 500 `{ message: "Internal server error" }`

  - Meme image update API endpoint handler
  -

---

### PATCH `/api/v1/meme-images/{id}/image`

**WARNING**: The `id` in `/api/v1/meme-images/{id}/image` is the ID of the MemeImage and not of the image itself.
This however is not the case for [GET `/api/v1/meme-images/{imageHash}/image`](#get-apiv1meme-imagesimageHashimage).

#### Request (example):

Anything within `<>` in the following request is variable.

```tsx
PATCH /api/v1/meme-images/<id>/image HTTP/<version>
Host: <server-host>
Content-Type: multipart/form-data; boundary=<boundary-name>
Content-Length: <calculated-on-send>

--<boundary-name>
Content-Disposition: form-data; name="image"; filename="<file-name-on-system>"
Content-Type: <image-file-type>

<binary-jpeg-data>
--<boundary-name>--
```

#### Notes:

- Only the image file can be updated via this endpoint.
- Image uploaded can be of any format but is converted always to JPEG for compression and consistency.
- User must be the original uploader to update the image.

#### Response (`200`):

```ts
{ message: "Updated meme image", memeImageId: string }
```

#### Error codes (w/ sample messages):

- 400 `{ message: "Bad request" }`
- 401 `{ message: "Invalid auth credentials" }`
- 403 `{ message: "Forbidden" }`
- 405 `{ message: "Method not allowed" }`
- 429 `{ message: "Too many requests. Try again after some time" }`
- 500 `{ message: "Internal server error" }`

---

### GET `/api/v1/meme-images/{imageHash}/image`

#### Response (`200`)

- Streams the image file as `image/jpeg` (content type matches the file format in Firebase, generally JPEG).
- If JPEG, it's probably progressive.
- Headers set:

- `Content-Type`: MIME type of the image.
- `Content-Length`: Size of the file in bytes.
- `Cache-Control: public, max-age=31536000, immutable`: caching for frontend. (experimental, maybe removed)

**WARNING**:
- `/api/v1/meme-images/{imageHash}/image` requires that `imageHash` be the SHA-256 hash of the uploaded image.
- The complete API URL to GET the image for a MemeImage can be accessed using the field `imageUrl` on the JSON body returned by [GET `/api/v1/meme-images/{id}`](#get-apiv1meme-imagesid).
- Hence, the frontend will never need to know the actual value of a `imageHash` for a MemeImage.

#### Error codes (w/ sample messages):

- `400` Bad request (invalid `id`).
- `404` File not found.
- `429` Too many requests.
- `500` Internal server error.

#### Notes

- Streams the image directly without fully loading it into memory.
- Any streaming error triggers a `500` response if headers are not yet sent.
- This endpoint does **not** require authentication.
- If JPEG, it's probably progressive.

---

### POST `/api/v1/created-memes`

#### Request:

```ts
[
  {
    memeImageId: string,
    content: [
      {
        text: string,
        rgba: string,
        x: double,
        y: double,
      },
      ...
    ]
  },
  ...
]
```

#### Response (`201`):

```ts
{ message: "Saved meme", id: string }
```

#### Response (`202`):

Uploading same meme (deep equality check) will return same meme ID.

```ts
{ message: "Already exists", id: string }
```

#### Error codes (w/ sample messages):

- 400 `{ message: "Bad request" }`
- 401 `{ message: "Not logged in" }`
- 405 `{ message: "Method not allowed" }`
- 429 `{ message: "Too many requests. Try again after some time" }`
- 500 `{ message: "Internal server error" }`

---

### GET `/api/v1/created-memes?chunk=[int:1]`

#### Response (`200`):

```ts
{
  totalChunks: int,
  currentChunk: int,
  totalItems: int,
  items: [
    {
      memeImageId: string,
      content: [
        {
          text: string,
          rgba: string,
          x: double,
          y: double,
        },
        ...
      ]
    },
    ...
  ]
}
```

#### Error codes (w/ sample messages):

- 400 `{ message: "Bad request" }`
- 405 `{ message: "Method not allowed" }`
- 429 `{ message: "Too many requests. Try again after some time" }`
- 500 `{ message: "Internal server error" }`

---

## Rate Limits (per min)

| Has Type | Action  | Rate |
| -------- | ------- | ---- |
| Image    | Read    | 120  |
| Image    | Upload  | 10   |
| Params   | Read    | 60   |
| Params   | Update  | 20   |
| Params   | Search  | 60   |
| Any      | Create  | 5    |
| Any      | Delete  | 5    |
| Logging  | Logging | 60   |

Where:

- Has Type refers to one of the several types of data a single request has.
  For e.g. A request can have both images and params, but images have lower rates, the rate limiter will take the lower rate.
- Action refers to the kind of response
- Rate refers to number of that request allowed in a minute
