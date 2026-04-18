local cjson = require("cjson.safe")
local frontmatter = require("frontmatter")

local _M = {}
local DATA_DIR = "/data/"

-- Helper: slugify a string for use as filename
local function slugify(str)
    str = str:lower()
    str = str:gsub("[^%w%s-]", "")
    str = str:gsub("%s+", "-")
    str = str:gsub("%-+", "-")
    str = str:gsub("^%-", ""):gsub("%-$", "")
    return str
end

-- Helper: read file contents
local function read_file(path)
    local f = io.open(path, "r")
    if not f then return nil end
    local content = f:read("*a")
    f:close()
    return content
end

-- Helper: write file contents
local function write_file(path, content)
    local f = io.open(path, "w")
    if not f then return false end
    f:write(content)
    f:close()
    return true
end

-- Helper: check if file exists
local function file_exists(path)
    local f = io.open(path, "r")
    if f then f:close() return true end
    return false
end

-- Helper: list all .md files in data dir
local function list_md_files()
    local files = {}
    local handle = io.popen('ls ' .. DATA_DIR .. '*.md 2>/dev/null')
    if not handle then return files end
    for line in handle:lines() do
        files[#files + 1] = line
    end
    handle:close()
    return files
end

-- Helper: today's date as YYYY-MM-DD
local function today()
    return os.date("%Y-%m-%d")
end

-- Helper: add days to a date string
local function add_days(date_str, days)
    local y, m, d = date_str:match("(%d+)-(%d+)-(%d+)")
    if not y then return date_str end
    local t = os.time({ year = tonumber(y), month = tonumber(m), day = tonumber(d) })
    t = t + (days * 86400)
    return os.date("%Y-%m-%d", t)
end

-- Helper: send JSON response
local function json_response(status, data)
    ngx.status = status
    ngx.header["Content-Type"] = "application/json"
    ngx.say(cjson.encode(data))
    ngx.exit(status)
end

-- GET /notes - list all notes (metadata only)
function _M.list()
    local files = list_md_files()
    local notes = {}

    for _, path in ipairs(files) do
        local content = read_file(path)
        if content then
            local meta = frontmatter.parse(content)
            local id = path:match("([^/]+)%.md$")
            meta.id = id
            notes[#notes + 1] = meta
        end
    end

    json_response(200, { notes = notes })
end

-- GET /notes/:id - get single note
function _M.get(id)
    local path = DATA_DIR .. id .. ".md"
    if not file_exists(path) then
        json_response(404, { error = "note not found" })
        return
    end

    local content = read_file(path)
    local meta, body = frontmatter.parse(content)
    meta.id = id
    json_response(200, { note = meta, body = body })
end

-- POST /notes - create a new note
function _M.create()
    ngx.req.read_body()
    local raw = ngx.req.get_body_data()
    if not raw then
        json_response(400, { error = "empty body" })
        return
    end

    local data = cjson.decode(raw)
    if not data or not data.title then
        json_response(400, { error = "title is required" })
        return
    end

    local id = slugify(data.title)
    local path = DATA_DIR .. id .. ".md"

    if file_exists(path) then
        json_response(409, { error = "note already exists" })
        return
    end

    local now = today()
    local meta = {
        title = data.title,
        created = now,
        last_review = now,
        next_review = add_days(now, data.review_days or 7),
        tags = data.tags or ""
    }

    local body = data.body or ""
    local content = frontmatter.serialize(meta, body)

    if not write_file(path, content) then
        json_response(500, { error = "failed to write note" })
        return
    end

    meta.id = id
    json_response(201, { note = meta })
end

-- PUT /notes/:id - update a note
function _M.update(id)
    local path = DATA_DIR .. id .. ".md"
    if not file_exists(path) then
        json_response(404, { error = "note not found" })
        return
    end

    ngx.req.read_body()
    local raw = ngx.req.get_body_data()
    if not raw then
        json_response(400, { error = "empty body" })
        return
    end

    local data = cjson.decode(raw)
    if not data then
        json_response(400, { error = "invalid JSON" })
        return
    end

    -- Read existing note to preserve metadata
    local existing = read_file(path)
    local meta, old_body = frontmatter.parse(existing)

    -- Update fields if provided
    if data.title then meta.title = data.title end
    if data.tags then meta.tags = data.tags end
    local body = data.body or old_body

    local content = frontmatter.serialize(meta, body)
    if not write_file(path, content) then
        json_response(500, { error = "failed to write note" })
        return
    end

    meta.id = id
    json_response(200, { note = meta })
end

-- DELETE /notes/:id - delete a note
function _M.delete(id)
    local path = DATA_DIR .. id .. ".md"
    if not file_exists(path) then
        json_response(404, { error = "note not found" })
        return
    end

    os.remove(path)
    json_response(200, { deleted = id })
end

-- PATCH /notes/:id/review - mark as reviewed
function _M.review(id)
    local path = DATA_DIR .. id .. ".md"
    if not file_exists(path) then
        json_response(404, { error = "note not found" })
        return
    end

    -- Get optional days parameter
    local args = ngx.req.get_uri_args()
    local days = tonumber(args.days) or 7

    local content = read_file(path)
    local meta, body = frontmatter.parse(content)

    local now = today()
    meta.last_review = now
    meta.next_review = add_days(now, days)

    local new_content = frontmatter.serialize(meta, body)
    if not write_file(path, new_content) then
        json_response(500, { error = "failed to update note" })
        return
    end

    meta.id = id
    json_response(200, { note = meta })
end

-- Helper: count plain-substring occurrences (case-sensitive, no Lua patterns)
local function count_occ(s, needle)
    if not s or not needle or needle == "" then return 0 end
    local count, pos = 0, 1
    while true do
        local i = s:find(needle, pos, true)
        if not i then return count end
        count = count + 1
        pos = i + #needle
    end
end

-- GET /notes/search?q=<terms>&tag=<tag>&limit=N - full-text search with ranking
function _M.search()
    local args = ngx.req.get_uri_args()
    local q = (args.q or ""):lower()
    local tag_filter = args.tag and args.tag:lower() or nil
    local limit = tonumber(args.limit) or 10

    if q == "" and not tag_filter then
        json_response(400, { error = "provide q or tag" })
        return
    end

    local terms = {}
    for term in q:gmatch("%S+") do
        terms[#terms + 1] = term
    end

    local files = list_md_files()
    local results = {}

    for _, path in ipairs(files) do
        local content = read_file(path)
        if content then
            local meta, body = frontmatter.parse(content)
            local id = path:match("([^/]+)%.md$")
            local tags_lower = (meta.tags or ""):lower()

            local tag_ok = (not tag_filter) or (tags_lower:find(tag_filter, 1, true) ~= nil)

            if tag_ok then
                local title_lower = (meta.title or ""):lower()
                local body_lower = (body or ""):lower()

                local score = 0
                local matches = { title = 0, tags = 0, body = 0 }

                if #terms > 1 and title_lower:find(q, 1, true) then
                    score = score + 5
                end

                for _, term in ipairs(terms) do
                    local c_title = count_occ(title_lower, term)
                    local c_tags  = count_occ(tags_lower, term)
                    local c_body  = count_occ(body_lower, term)
                    score = score + (3 * c_title) + (2 * c_tags) + math.min(c_body, 5)
                    matches.title = matches.title + c_title
                    matches.tags  = matches.tags + c_tags
                    matches.body  = matches.body + c_body
                end

                local keep = score > 0 or (tag_filter and q == "")
                if keep then
                    local snippet = nil
                    if terms[1] and body and #body > 0 then
                        local pos = body_lower:find(terms[1], 1, true)
                        if pos then
                            local s = math.max(1, pos - 40)
                            local e = math.min(#body, pos + #terms[1] + 40)
                            snippet = body:sub(s, e)
                            if s > 1 then snippet = "..." .. snippet end
                            if e < #body then snippet = snippet .. "..." end
                        end
                    end

                    results[#results + 1] = {
                        id = id,
                        title = meta.title,
                        tags = meta.tags,
                        score = score,
                        matches = matches,
                        snippet = snippet
                    }
                end
            end
        end
    end

    table.sort(results, function(a, b) return a.score > b.score end)

    local limited = {}
    for i = 1, math.min(limit, #results) do
        limited[i] = results[i]
    end

    json_response(200, {
        query = q,
        tag = tag_filter,
        count = #results,
        results = limited
    })
end

-- GET /notes/review/pending - get notes needing review
function _M.pending()
    local files = list_md_files()
    local now = today()
    local pending = {}

    for _, path in ipairs(files) do
        local content = read_file(path)
        if content then
            local meta = frontmatter.parse(content)
            if meta.next_review and meta.next_review <= now then
                local id = path:match("([^/]+)%.md$")
                meta.id = id
                pending[#pending + 1] = meta
            end
        end
    end

    json_response(200, { notes = pending, count = #pending })
end

return _M
