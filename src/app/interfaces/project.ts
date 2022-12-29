export interface Project {
    id: number,
    name: string,
    description: string,
    full_name: string,
    private: boolean,
    html_url: string,
    clone_url: string,
    topics: string[],
    list_image: string
}
