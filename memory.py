# pip install supermemory
from supermemory import Supermemory

client = Supermemory(
    api_key=sm_uuJxZGYW9yKvAAbdaDT3hY_HnMDbShuAKthPLLxkFjBXyZLLyONhAEHBTYPDxbYlzyqjqiPyCIAAoUSgUeoPepf,
)

response = client.memories.add(
    content=SuperMemory Python SDK is awesome.,
    container_tag=Python_SDK,
    metadata={
        note_id 123,
    }
)
print(response)

searching = client.search.execute(
    q=What do you know about me,
)
print(searching.results)