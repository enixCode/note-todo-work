local _M = {}

-- Parse frontmatter from markdown content
-- Returns: metadata table, body string
function _M.parse(content)
    if not content or content == "" then
        return {}, ""
    end

    local meta = {}
    local body = content

    -- Check for frontmatter delimiters (---\n...\n---)
    local fm_start, fm_end = content:find("^%-%-%-\n(.-)%-%-%-\n")
    if fm_start then
        local fm_block = content:match("^%-%-%-\n(.-)%-%-%-\n")
        body = content:sub(fm_end + 1)

        -- Parse each key: value line
        for line in fm_block:gmatch("[^\n]+") do
            local key, value = line:match("^(%S+):%s*(.+)$")
            if key and value then
                -- Trim whitespace
                value = value:match("^%s*(.-)%s*$")
                meta[key] = value
            end
        end
    end

    return meta, body
end

-- Serialize metadata + body back to markdown with frontmatter
function _M.serialize(meta, body)
    local parts = { "---\n" }

    -- Write fields in a consistent order
    local ordered_keys = { "title", "created", "last_review", "next_review", "tags" }
    local written = {}

    for _, key in ipairs(ordered_keys) do
        if meta[key] then
            parts[#parts + 1] = key .. ": " .. tostring(meta[key]) .. "\n"
            written[key] = true
        end
    end

    -- Write any remaining keys not in the ordered list
    for key, value in pairs(meta) do
        if not written[key] then
            parts[#parts + 1] = key .. ": " .. tostring(value) .. "\n"
        end
    end

    parts[#parts + 1] = "---\n"
    parts[#parts + 1] = body

    return table.concat(parts)
end

return _M
