# Shsc Online REPL

- Language Docs [`@AvirukBasak/shsc-lang/LanguageDocs`](https://github.com/AvirukBasak/shsc-lang/blob/main-2.x/docs/LanguageDocs.md)
- Examples [`@AvirukBasak/shsc-lang/examples`](https://github.com/AvirukBasak/shsc-lang/tree/main-2.x/examples)

## Features
- Runs a custom binary in deployment (here, vercel) environment.
- Uses `bwrap` to sandbox the binary if `bwrap` is present.
- Else, uses temporary directory. Can be broken through path traversal.
- Recommended: deployment environment should be an isolated container with no user data present.

## API

### POST `/api/v1/script/run?text=[bool:false]`

#### Query

- `text`: If `true`, response will be plain text, JSON otherwise.

#### Request

With `Content-Type: application/json`:

```ts
{
    code: string,
    stdin?: string,
}
```

With `Content-Type: text/plain`:

```
<string>
```

No support for `stdin` when request is `text/plain`.

#### Response

```ts
{
    code?: string | number,
    stdout?: string,
    stderr?: string,
}
```

#### Example

Postman: [view](https://avirukbasak-team.postman.co/workspace/API-Testbed~da150b8d-0fe6-4487-b4a8-420c156e003f/collection/19078959-6c339452-f8dc-404b-8b8c-2498eb537d47?action=share&creator=19078959)

With `Content-Type: text/plain` & `?text=true`:

```lua
module main

proc main()
    var inp = 5
    var res = factorial(inp)
    io:print(f"result = {res}\n")
end

proc factorial(num)
    if num <= 1 then
        return 1
    else
        return num * factorial(num - 1)
    end
end
```

Response:

```
CODE: 0
--------------------------------------------------
STDOUT:
--------------------------------------------------
result = 120

--------------------------------------------------
STDERR:
--------------------------------------------------

--------------------------------------------------
```
