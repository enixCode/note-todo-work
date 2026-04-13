local _M = {}

function _M.check()
    local api_key = os.getenv("API_KEY")

    -- If no API_KEY set, skip auth (open mode)
    if not api_key or api_key == "" then
        return
    end

    -- Check X-Api-Key header
    local provided = ngx.req.get_headers()["X-Api-Key"]
    if provided == api_key then
        return
    end

    -- Check ?api_key query param (for simple usage)
    local args = ngx.req.get_uri_args()
    if args.api_key == api_key then
        return
    end

    ngx.status = 401
    ngx.header["Content-Type"] = "application/json"
    ngx.say('{"error":"unauthorized"}')
    ngx.exit(401)
end

return _M
